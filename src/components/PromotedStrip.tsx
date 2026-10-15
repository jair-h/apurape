"use client";

/* Franja "Publicidad" — Destacados pagados, separados del orden por mérito.
 *
 * Trae hasta 3 anuncios de la categoría con ad_pick (rotación por peso), los
 * muestra SIEMPRE marcados como "Publicidad", y cuenta:
 *   · impresión cuando la tarjeta se VE de verdad (IntersectionObserver),
 *     una vez por carga; el servidor deduplica por visitante/día.
 *   · clic al pulsarla, antes de navegar al perfil.
 * El marcador anónimo del visitante vive en localStorage (no es login).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Megaphone, Star, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Promo {
  id: string; kind: string; advertiser_id: string; service_id: string | null;
}
interface Card {
  promoId: string;
  href: string;
  title: string;
  subtitle: string;
  image: string | null;
  rating: number | null;
}

function viewerHash(): string {
  try {
    const k = "apurape_vh";
    let v = localStorage.getItem(k);
    if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, v); }
    return v;
  } catch { return "anon"; }
}

function sendEvent(promotion_id: string, kind: "impresion" | "clic", placement: string) {
  try {
    const body = JSON.stringify({ promotion_id, kind, viewer_hash: viewerHash(), placement });
    // keepalive para que el clic no se pierda al navegar.
    fetch("/api/publicidad/evento", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
  } catch { /* nunca rompe la página */ }
}

export default function PromotedStrip({ categoryId, placement = "busqueda" }: { categoryId: string | null; placement?: string }) {
  const supabase = createClient();
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    if (!categoryId) { setCards([]); return; }
    let cancel = false;

    (async () => {
      const { data: promos } = await supabase.rpc("ad_pick", { p_category_id: categoryId, p_placement: placement });
      const list = (promos as Promo[] | null) ?? [];
      if (list.length === 0) { if (!cancel) setCards([]); return; }

      const advIds = [...new Set(list.map(p => p.advertiser_id))];
      const svcIds = list.filter(p => p.kind === "producto" && p.service_id).map(p => p.service_id as string);

      const [{ data: profs }, { data: svcs }] = await Promise.all([
        supabase.from("profiles")
          .select("id, name, business_name, account_type, avatar_url, logo_url, district, rating")
          .in("id", advIds),
        svcIds.length
          ? supabase.from("provider_services").select("id, title, photos, price_from, provider_id").in("id", svcIds)
          : Promise.resolve({ data: [] as unknown[] }),
      ]);

      type Prof = { id: string; name: string | null; business_name: string | null; account_type: string; avatar_url: string | null; logo_url: string | null; district: string | null; rating: number | null };
      type Svc = { id: string; title: string; photos: string[] | null; price_from: number | null; provider_id: string };
      const pMap = new Map((profs as Prof[] ?? []).map(p => [p.id, p]));
      const sMap = new Map((svcs as Svc[] ?? []).map(s => [s.id, s]));

      const built: Card[] = list.map(promo => {
        const prof = pMap.get(promo.advertiser_id);
        const nombre = prof ? (prof.account_type === "negocio" ? (prof.business_name || prof.name) : prof.name) || "Proveedor" : "Proveedor";
        if (promo.kind === "producto" && promo.service_id) {
          const s = sMap.get(promo.service_id);
          return {
            promoId: promo.id,
            href: `/perfil/${promo.advertiser_id}`,
            title: s?.title ?? nombre,
            subtitle: nombre,
            image: (s?.photos && s.photos[0]) || prof?.logo_url || prof?.avatar_url || null,
            rating: prof?.rating ?? null,
          };
        }
        return {
          promoId: promo.id,
          href: `/perfil/${promo.advertiser_id}`,
          title: nombre,
          subtitle: prof?.district ? `${prof.district}` : "Proveedor destacado",
          image: prof?.logo_url || prof?.avatar_url || null,
          rating: prof?.rating ?? null,
        };
      });

      if (!cancel) setCards(built);
    })();

    return () => { cancel = true; };
  }, [categoryId, placement, supabase]);

  if (cards.length === 0) return null;

  return (
    <section className="mb-6" aria-label="Publicidad">
      <div className="flex items-center gap-1.5 mb-2">
        <Megaphone className="h-3.5 w-3.5 text-[#6B7280]" />
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">Publicidad</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => <PromoCard key={c.promoId} card={c} placement={placement} />)}
      </div>
    </section>
  );
}

function PromoCard({ card, placement }: { card: Card; placement: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen.current) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= 0.5 && !seen.current) {
          seen.current = true;
          sendEvent(card.promoId, "impresion", placement);
          io.disconnect();
        }
      }
    }, { threshold: [0.5] });
    io.observe(el);
    return () => io.disconnect();
  }, [card.promoId, placement]);

  return (
    <Link ref={ref} href={card.href} onClick={() => sendEvent(card.promoId, "clic", placement)}
      className="group relative block bg-white rounded-2xl border border-[#FDE3E1] ring-1 ring-[#FEF3F2] overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
      <span className="absolute top-2 left-2 z-10 bg-white/90 text-[#6B7280] text-[10px] font-bold px-2 py-0.5 rounded-full">Publicidad</span>
      <div className="aspect-video bg-[#FEF3F2] overflow-hidden">
        {card.image
          ? <img src={card.image} alt={card.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          : <div className="w-full h-full flex items-center justify-center"><Megaphone className="h-8 w-8 text-[#F97066]" /></div>}
      </div>
      <div className="p-3">
        <p className="font-bold text-sm text-[#1E293B] line-clamp-1">{card.title}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-[#6B7280] line-clamp-1 inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {card.subtitle}
          </p>
          {card.rating != null && card.rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-500">
              <Star className="h-3 w-3 fill-current" /> {Number(card.rating).toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
