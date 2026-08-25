"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Truck, DollarSign,
  Package, Star, Calendar, ChevronRight,
  MessageCircle, FileText, Award, Loader2,
  Globe, Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { findOrCreateConversation } from "@/lib/conversations";
import PublicNavAuthSection from "@/components/PublicNavAuthSection";

/* ─── Constants ───────────────────────────────────────────── */

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const MONTH_INDEX: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

const CATEGORY_LABELS: Record<string, string> = {
  fruta: "Fruta", verdura: "Verdura", grano: "Grano",
  procesado: "Procesado", insumo: "Insumo", ganaderia: "Ganadería", otro: "Otro",
};

/* ─── Types ───────────────────────────────────────────────── */

interface ProductoData {
  id: string;
  owner_id: string;
  name: string;
  variety: string | null;
  scientific_name?: string | null;
  hs_code: string | null;
  category: string;
  description: string | null;
  presentation?: string | null;
  markets?: string[];
  monthly_volume_tm?: number | null;
  annual_volume_tm?: number | null;
  ref_price_fob_usd: number | null;
  price_unit: string;
  available_months: (string | number)[];
  certifications: string[];
  photos: string[];
  preferred_port?: string | null;
  status: string;
  brand_name?: string | null;
  is_branded?: boolean;
  brand_story?: string | null;
}

interface SellerInfo {
  name: string | null;
  region: string | null;
  country: string | null;
  rating: number | null;
  operations_count: number | null;
  verified: boolean | null;
  display_name: string | null;   // farm_name or razon_social
  description: string | null;
}

/* ─── Helpers ─────────────────────────────────────────────── */

function toMonthIndexes(months: (string | number)[]): number[] {
  return months
    .map((m) => {
      const s = String(m).toLowerCase().trim();
      if (s in MONTH_INDEX) return MONTH_INDEX[s];
      const n = parseInt(s);
      return isNaN(n) ? -1 : n;
    })
    .filter((n) => n >= 0 && n <= 11);
}

function isInSeason(months: number[]): boolean {
  return months.includes(new Date().getMonth());
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }).map((_, i) => (
    <Star key={i}
      className={`h-3.5 w-3.5 ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`}
    />
  ));
}

/* ─── Photo gallery ───────────────────────────────────────── */

function PhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const [main, setMain] = useState(0);
  if (photos.length === 0) {
    return (
      <div className="w-full aspect-[4/3] bg-[#E1F5EE] rounded-2xl flex items-center justify-center">
        <Package className="h-20 w-20 text-[#1D9E75]/25" />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[main]} alt={name} className="w-full h-full object-cover" />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((src, i) => (
            <button key={i} onClick={() => setMain(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                i === main ? "border-[#1D9E75]" : "border-gray-200 hover:border-gray-300"
              }`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Month grid ──────────────────────────────────────────── */

function MonthGrid({ months }: { months: number[] }) {
  const current = new Date().getMonth();
  return (
    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
      {MONTHS.map((label, i) => {
        const available = months.includes(i);
        const isCurrent = i === current && available;
        return (
          <div key={label}
            className={`flex flex-col items-center py-2.5 rounded-xl text-[10px] font-bold select-none ${
              isCurrent  ? "bg-[#1D9E75] text-white ring-2 ring-[#1D9E75] ring-offset-1"
              : available ? "bg-[#E1F5EE] text-[#085041]"
              : "bg-gray-100 text-gray-300"
            }`}>
            <span className="text-[8px] font-semibold opacity-60 mb-0.5">{i + 1}</span>
            {label}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Inner page (uses useSearchParams) ───────────────────── */

function ProductoInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tipo = (searchParams.get("tipo") ?? "productor") as "productor" | "exportador";
  const isExporter = tipo === "exportador";

  const [product,       setProduct]       = useState<ProductoData | null>(null);
  const [seller,        setSeller]        = useState<SellerInfo | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [notFound,      setNotFound]      = useState(false);
  const [isLoggedIn,    setIsLoggedIn]    = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setCurrentUserId(user?.id ?? null);

      if (isExporter) {
        /* ── Exportador path ── */
        const { data: ep, error } = await supabase
          .from("exporter_products")
          .select("*")
          .eq("id", id)
          .eq("status", "active")
          .single();

        if (error || !ep) { setNotFound(true); setLoading(false); return; }

        setProduct({
          id:               ep.id,
          owner_id:         ep.exporter_id,
          name:             ep.product_name,
          variety:          ep.variety        ?? null,
          scientific_name:  ep.scientific_name ?? null,
          hs_code:          ep.hs_code        ?? null,
          category:         ep.category,
          description:      ep.description    ?? null,
          presentation:     ep.presentation   ?? null,
          markets:          ep.markets        ?? [],
          annual_volume_tm: ep.annual_volume_tm ?? null,
          ref_price_fob_usd: ep.ref_price_fob_usd ?? null,
          price_unit:       ep.price_unit     ?? "kg",
          available_months: ep.available_months ?? [],
          certifications:   ep.certifications ?? [],
          photos:           ep.photos         ?? [],
          status:           ep.status,
          is_branded:       ep.is_branded     ?? false,
          brand_name:       ep.brand_name     ?? null,
          brand_story:      ep.brand_story    ?? null,
        });

        const [{ data: profile }, { data: expProfile }] = await Promise.all([
          supabase.from("profiles")
            .select("name, region, country, rating, operations_count, verified")
            .eq("user_id", ep.exporter_id).single(),
          supabase.from("exporter_profiles")
            .select("razon_social, description")
            .eq("user_id", ep.exporter_id).single(),
        ]);

        setSeller({
          name:             profile?.name             ?? null,
          region:           profile?.region           ?? null,
          country:          profile?.country          ?? null,
          rating:           profile?.rating           ?? null,
          operations_count: profile?.operations_count ?? null,
          verified:         profile?.verified         ?? null,
          display_name:     expProfile?.razon_social  ?? profile?.name ?? null,
          description:      expProfile?.description   ?? null,
        });

      } else {
        /* ── Productor path ── */
        const { data: prod, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .eq("status", "active")
          .single();

        if (error || !prod) { setNotFound(true); setLoading(false); return; }

        setProduct({
          id:                prod.id,
          owner_id:          prod.producer_id,
          name:              prod.name,
          variety:           prod.variety       ?? null,
          hs_code:           prod.hs_code       ?? null,
          category:          prod.category,
          description:       prod.description   ?? null,
          monthly_volume_tm: prod.monthly_volume_tm ?? null,
          ref_price_fob_usd: prod.ref_price_fob_usd ?? null,
          price_unit:        prod.price_unit    ?? "kg",
          available_months:  prod.available_months ?? [],
          certifications:    prod.certifications ?? [],
          photos:            prod.photos        ?? [],
          preferred_port:    prod.preferred_port ?? null,
          status:            prod.status,
          is_branded:        prod.is_branded     ?? false,
          brand_name:        prod.brand_name     ?? null,
          brand_story:       prod.brand_story    ?? null,
        });

        const [{ data: profile }, { data: pp }] = await Promise.all([
          supabase.from("profiles")
            .select("name, region, country, rating, operations_count, verified")
            .eq("user_id", prod.producer_id).single(),
          supabase.from("producer_profiles")
            .select("farm_name, description")
            .eq("user_id", prod.producer_id).single(),
        ]);

        setSeller({
          name:             profile?.name             ?? null,
          region:           profile?.region           ?? null,
          country:          profile?.country          ?? null,
          rating:           profile?.rating           ?? null,
          operations_count: profile?.operations_count ?? null,
          verified:         profile?.verified         ?? null,
          display_name:     pp?.farm_name             ?? profile?.name ?? null,
          description:      pp?.description           ?? null,
        });
      }

      setLoading(false);
    }
    load();
  }, [id, isExporter]);

  const handleContact = async () => {
    if (!currentUserId || !product) return;
    setContactLoading(true);
    const convId = await findOrCreateConversation(
      currentUserId,
      product.owner_id,
      product.id,
      tipo,
    );
    router.push(convId ? `/dashboard/mensajes?conv=${convId}` : "/dashboard/mensajes");
    setContactLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <Package className="h-16 w-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-[#085041] mb-2">Producto no encontrado</h1>
        <p className="text-sm text-[#6B7280] mb-6">Este producto no existe o ya no está disponible.</p>
        <Link href="/catalogo" className="bg-[#1D9E75] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#085041] transition-colors">
          Ver catálogo
        </Link>
      </div>
    );
  }

  const months   = toMonthIndexes(product.available_months);
  const inSeason = isInSeason(months);
  const cotizarHref = isLoggedIn ? "/dashboard/exportador/rfq/nuevo" : `/register?next=/producto/${id}?tipo=${tipo}`;

  const volumeEl = isExporter
    ? (product.annual_volume_tm  != null ? <><strong>{product.annual_volume_tm}</strong> TM/año</> : null)
    : (product.monthly_volume_tm != null ? <><strong>{product.monthly_volume_tm}</strong> TM/mes</> : null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/markaru-logo.png" alt="MARKARU" className="h-8 w-auto object-contain" />
            <span className="font-bold text-sm text-gray-900 hidden sm:block">
              MARKARU
            </span>
          </Link>
          <PublicNavAuthSection />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[#6B7280] mb-5">
          <Link href="/catalogo" className="flex items-center gap-1 hover:text-[#1D9E75] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Catálogo
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[#085041] font-semibold truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT ────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Photo gallery */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <PhotoGallery photos={product.photos} name={product.name} />
            </div>

            {/* Product info */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[10px] font-bold bg-[#E1F5EE] text-[#085041] px-2.5 py-1 rounded-full">
                  {CATEGORY_LABELS[product.category] ?? product.category}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  isExporter ? "bg-blue-600 text-white" : "bg-[#085041] text-white"
                }`}>
                  {isExporter ? "Exportador" : "Productor directo"}
                </span>
                {inSeason && (
                  <span className="text-[10px] font-bold bg-[#1D9E75] text-white px-2.5 py-1 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> En temporada
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-extrabold text-[#085041] mb-1">{product.name}</h1>
              {product.variety && (
                <p className="text-sm text-[#6B7280] mb-1">Variedad: <span className="font-semibold text-[#1E293B]">{product.variety}</span></p>
              )}
              {product.scientific_name && (
                <p className="text-xs text-[#6B7280] italic mb-1">{product.scientific_name}</p>
              )}
              {product.hs_code && (
                <p className="text-xs text-[#6B7280] mb-4">
                  Partida arancelaria: <span className="font-mono font-semibold text-[#1E293B]">{product.hs_code}</span>
                </p>
              )}

              {product.description && (
                <p className="text-sm text-[#4B5563] leading-relaxed mb-5 border-t border-gray-100 pt-4">
                  {product.description}
                </p>
              )}

              {/* Brand */}
              {product.is_branded && product.brand_name && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 mb-5">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5" /> Marca propia · {product.brand_name}
                  </p>
                  {product.brand_story && (
                    <p className="text-xs text-amber-800 leading-relaxed">{product.brand_story}</p>
                  )}
                </div>
              )}

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {product.ref_price_fob_usd != null && (
                  <div className="bg-[#E1F5EE] rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-[#6B7280] text-xs mb-1">
                      <DollarSign className="h-3.5 w-3.5" /> Precio referencial
                    </div>
                    <p className="text-lg font-extrabold text-[#085041]">
                      USD {product.ref_price_fob_usd}
                      <span className="text-xs font-normal text-[#6B7280] ml-1">/{product.price_unit} FOB</span>
                    </p>
                  </div>
                )}
                {volumeEl && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-[#6B7280] text-xs mb-1">
                      <Truck className="h-3.5 w-3.5" /> Volumen disponible
                    </div>
                    <p className="text-sm font-extrabold text-[#085041]">{volumeEl}</p>
                  </div>
                )}
              </div>

              {/* Presentation */}
              {product.presentation && (
                <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-3">
                  <Package className="h-4 w-4 text-[#1D9E75]" />
                  Presentación: <span className="font-semibold text-[#1E293B]">{product.presentation}</span>
                </div>
              )}

              {/* Preferred port */}
              {product.preferred_port && (
                <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-3">
                  <MapPin className="h-4 w-4 text-[#1D9E75]" />
                  Puerto de salida: <span className="font-semibold text-[#1E293B]">{product.preferred_port}</span>
                </div>
              )}

              {/* Markets (exporters) */}
              {isExporter && product.markets && product.markets.length > 0 && (
                <div className="border-t border-gray-100 pt-4 mb-5">
                  <p className="text-xs font-bold text-[#085041] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> Mercados destino
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.markets.map((m) => (
                      <span key={m} className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {product.certifications.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-[#085041] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5" /> Certificaciones
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.certifications.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 text-xs font-semibold bg-[#E1F5EE] text-[#085041] border border-[#1D9E75]/20 px-3 py-1.5 rounded-full">
                        <Award className="h-3 w-3" /> {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Availability */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-bold text-[#085041] flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-[#1D9E75]" /> Disponibilidad por mes
              </h2>
              {months.length > 0 ? (
                <>
                  <MonthGrid months={months} />
                  <p className="text-xs text-[#6B7280] mt-3">
                    Disponible en: <span className="font-semibold text-[#1E293B]">
                      {months.sort((a, b) => a - b).map((i) => MONTHS[i]).join(", ")}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#6B7280]">No se han especificado meses de disponibilidad.</p>
              )}
            </div>
          </div>

          {/* ── RIGHT sidebar ───────────────────────────────── */}
          <div className="space-y-4">

            {/* CTA card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sticky top-20">
              {product.ref_price_fob_usd != null && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-xs text-[#6B7280] mb-0.5">Precio referencial FOB</p>
                  <p className="text-3xl font-extrabold text-[#085041]">
                    USD {product.ref_price_fob_usd}
                    <span className="text-sm font-normal text-[#6B7280] ml-1">/{product.price_unit}</span>
                  </p>
                  <p className="text-[10px] text-[#6B7280] mt-1">Precio orientativo. La oferta final puede variar.</p>
                </div>
              )}
              <div className="space-y-2.5">
                <Link href={cotizarHref}
                  className="w-full flex items-center justify-center gap-2 bg-[#085041] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#1D9E75] transition-colors shadow-sm">
                  <FileText className="h-4 w-4" /> Solicitar oferta
                </Link>
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={handleContact}
                    disabled={contactLoading}
                    className="w-full flex items-center justify-center gap-2 border-2 border-[#1D9E75] text-[#085041] py-3 rounded-xl text-sm font-bold hover:bg-[#E1F5EE] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {contactLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <MessageCircle className="h-4 w-4" />}
                    Contactar proveedor
                  </button>
                ) : (
                  <Link href={`/register?next=/producto/${id}?tipo=${tipo}`}
                    className="w-full flex items-center justify-center gap-2 border-2 border-[#1D9E75] text-[#085041] py-3 rounded-xl text-sm font-bold hover:bg-[#E1F5EE] transition-colors">
                    <MessageCircle className="h-4 w-4" /> Contactar proveedor
                  </Link>
                )}
              </div>
              {!isLoggedIn && (
                <p className="text-[10px] text-[#6B7280] text-center mt-3">Registro gratuito · Sin tarjeta de crédito</p>
              )}
            </div>

            {/* Seller card */}
            {seller && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-xs font-bold text-[#085041] uppercase tracking-wider mb-3">
                  {isExporter ? "Sobre el exportador" : "Sobre el productor"}
                </h3>
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${isExporter ? "bg-blue-600" : "bg-[#085041]"}`}>
                    {(seller.display_name ?? seller.name ?? "P").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#085041] truncate">
                      {seller.display_name ?? seller.name ?? (isExporter ? "Exportador verificado" : "Productor verificado")}
                    </p>
                    {seller.name && seller.display_name && (
                      <p className="text-xs text-[#6B7280] truncate">{seller.name}</p>
                    )}
                    {(seller.region || seller.country) && (
                      <div className="flex items-center gap-1 text-xs text-[#6B7280] mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0 text-[#1D9E75]" />
                        {[seller.region, seller.country].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>

                {seller.rating != null && seller.rating > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-0.5">{renderStars(seller.rating)}</div>
                    <span className="text-xs font-semibold text-[#1E293B]">{Number(seller.rating).toFixed(1)}</span>
                    {seller.operations_count != null && seller.operations_count > 0 && (
                      <span className="text-xs text-[#6B7280]">· {seller.operations_count} operaciones</span>
                    )}
                  </div>
                )}

                {seller.verified && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D9E75] mb-3">
                    {isExporter ? <Building2 className="h-3.5 w-3.5" /> : <Award className="h-3.5 w-3.5" />}
                    Empresa verificada
                  </div>
                )}

                {seller.description && (
                  <p className="text-xs text-[#6B7280] leading-relaxed mb-3 line-clamp-3">{seller.description}</p>
                )}

                <Link
                  href={`/perfil/${product.owner_id}`}
                  className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-[#1D9E75] border border-[#1D9E75]/30 py-2 rounded-xl hover:bg-[#E1F5EE] transition-colors">
                  Ver perfil completo <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* Safe trade note */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
              <p className="text-[10px] text-[#6B7280] leading-relaxed">
                <span className="font-semibold text-[#085041]">Comercio seguro:</span> MARKARU verifica a productores
                y exportadores, y facilita acuerdos con documentación digital. Los precios son referenciales FOB.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page (Suspense wrapper required for useSearchParams) ── */

export default function ProductoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    }>
      <ProductoInner />
    </Suspense>
  );
}
