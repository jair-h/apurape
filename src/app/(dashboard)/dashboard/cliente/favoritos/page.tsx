"use client";

/* Proveedores que el Cliente guardó. */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Heart, Star, MapPin, MessageCircle, Trash2 } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { findOrCreateConversation } from "@/lib/conversations";

interface FavRow {
  provider_id: string;
  created_at: string;
  provider: {
    name: string | null; business_name: string | null;
    rating: number | null; ratings_count: number | null;
    verified: boolean | null; district: string | null; region: string | null;
    account_type: string | null;
    avatar_url: string | null;
  } | null;
}

export default function ClienteFavoritosPage() {
  const supabase = createClient();
  const router = useRouter();

  const [favs, setFavs]         = useState<FavRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userId, setUserId]     = useState<string | null>(null);
  const [busy, setBusy]         = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("favorites")
        .select("provider_id, created_at, provider:profiles!favorites_provider_id_fkey(name, business_name, rating, ratings_count, verified, district, region, avatar_url, account_type)")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      setFavs((data as unknown as FavRow[]) ?? []);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const quitar = async (providerId: string) => {
    if (!userId) return;
    setBusy(providerId);
    const { error } = await supabase.from("favorites").delete()
      .eq("client_id", userId).eq("provider_id", providerId);
    if (!error) setFavs(prev => prev.filter(f => f.provider_id !== providerId));
    setBusy(null);
  };

  const contactar = async (providerId: string) => {
    if (!userId) return;
    setBusy(providerId);
    const convId = await findOrCreateConversation(userId, providerId, { providerId });
    router.push(convId ? `/dashboard/mensajes?conv=${convId}` : "/dashboard/mensajes");
    setBusy(null);
  };

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#0E9384] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">Mis favoritos</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Proveedores que guardaste para volver a encontrarlos rápido.
        </p>
      </div>

      {favs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <Heart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-900">Todavía no guardaste a nadie</p>
          <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto leading-relaxed">
            Cuando encuentres un proveedor que te gustó, toca el corazón en su
            perfil y lo tendrás aquí para la próxima.
          </p>
          <Link href="/servicios"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#0E9384] text-white text-xs font-bold hover:bg-[#0B7268] transition-colors">
            Buscar servicios
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {favs.map(f => {
            const p = f.provider;
            const nombre = p?.business_name || p?.name || "Proveedor";
            const zona = [p?.district, p?.region].filter(Boolean).join(", ");
            return (
              <div key={f.provider_id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {p?.avatar_url
                      ? <img src={p.avatar_url} alt={nombre} className="w-full h-full object-cover" />
                      : <span className="text-lg font-extrabold text-[#D92D20]">{nombre.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/perfil/${f.provider_id}`}
                      className="text-sm font-bold text-gray-900 hover:text-[#0E9384] transition-colors truncate block">
                      {nombre}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {p?.ratings_count ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#6B7280]">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          {Number(p.rating).toFixed(1)} ({p.ratings_count})
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">Sin reseñas</span>
                      )}
                      <VerifiedBadge verified={p?.verified} accountType={p?.account_type} />
                    </div>
                  </div>
                </div>

                {zona && (
                  <p className="inline-flex items-center gap-1 text-[11px] text-[#6B7280] mb-3">
                    <MapPin className="h-3 w-3" /> {zona}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100">
                  <button type="button" onClick={() => contactar(f.provider_id)} disabled={busy === f.provider_id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0E9384] text-white text-xs font-bold hover:bg-[#0B7268] transition-colors disabled:opacity-50">
                    {busy === f.provider_id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <MessageCircle className="h-3.5 w-3.5" />}
                    Escribir
                  </button>
                  <button type="button" onClick={() => quitar(f.provider_id)} disabled={busy === f.provider_id}
                    title="Quitar de favoritos"
                    className="p-2 rounded-xl border border-gray-200 text-[#6B7280] hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
