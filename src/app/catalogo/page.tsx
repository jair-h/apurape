"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search, Package, MapPin, Truck,
  DollarSign, ChevronDown, X, Globe, Menu,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import PublicNavAuthSection from "@/components/PublicNavAuthSection";
import { FlagImg } from "@/components/FlagImg";

/* ─── Constants ───────────────────────────────────────────── */

const CATEGORIES = [
  { key: "fruta",     label: "Fruta" },
  { key: "verdura",   label: "Verdura" },
  { key: "grano",     label: "Grano" },
  { key: "procesado", label: "Procesado" },
  { key: "insumo",    label: "Insumo" },
  { key: "ganaderia", label: "Ganadería" },
  { key: "otro",      label: "Otro" },
];

const MONTH_INDEX: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

/* ─── Types ───────────────────────────────────────────────── */

interface CatalogItem {
  id: string;
  tipo: "productor" | "exportador";
  name: string;
  variety: string | null;
  category: string;
  description: string | null;
  ref_price_fob_usd: number | null;
  price_unit: string;
  months_num: number[];        // normalized to index 0-11 for season check
  certifications: string[];
  photos: string[];
  created_at: string;
  owner_id: string;
  volume_tm: number | null;
  volume_label: string;        // "TM/mes" or "TM/año"
  seller_name: string | null;
  seller_region: string | null;
  seller_rating: number | null;
  seller_country: string | null;
}

/* ─── Helpers ─────────────────────────────────────────────── */

function isInSeason(months: number[]): boolean {
  return months.includes(new Date().getMonth());
}

function catLabel(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

function normalizeProducerMonths(raw: (string | number)[]): number[] {
  return raw.map((x) => parseInt(String(x))).filter((n) => !isNaN(n));
}

function normalizeExporterMonths(raw: string[]): number[] {
  return raw.map((m) => MONTH_INDEX[m.toLowerCase()]).filter((n) => n !== undefined);
}

/* ─── Product image ───────────────────────────────────────── */

function ProductImage({ photos, name }: { photos: string[]; name: string }) {
  if (photos.length > 0) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photos[0]} alt={name}
        className="w-full aspect-[4/3] object-cover object-center group-hover:scale-105 transition-transform duration-300" />
    );
  }
  return (
    <div className="w-full aspect-[4/3] bg-[#E1F5EE] flex items-center justify-center">
      <Package className="h-14 w-14 text-[#1D9E75]/30" />
    </div>
  );
}

/* ─── Product card ────────────────────────────────────────── */

function ProductCard({ item }: { item: CatalogItem }) {
  const inSeason = isInSeason(item.months_num);
  const isExporter = item.tipo === "exportador";

  return (
    <Link
      href={`/producto/${item.id}?tipo=${item.tipo}`}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col"
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <ProductImage photos={item.photos} name={item.name} />
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {/* Tipo badge */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isExporter
              ? "bg-blue-600 text-white"
              : "bg-[#085041] text-white"
          }`}>
            {isExporter ? "Exportador" : "Productor directo"}
          </span>
          {inSeason && (
            <span className="bg-[#1D9E75] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              En temporada
            </span>
          )}
          <span className="bg-white/90 backdrop-blur-sm text-[#6B7280] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200">
            {catLabel(item.category)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-bold text-[#085041] group-hover:text-[#1D9E75] transition-colors line-clamp-1 mb-0.5">
          {item.name}
        </h3>
        {item.variety && (
          <p className="text-xs text-[#6B7280] mb-2">Var. {item.variety}</p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-3">
          {item.seller_country
            ? <FlagImg countryName={item.seller_country} />
            : isExporter
              ? <Globe className="h-3 w-3 flex-shrink-0 text-blue-500" />
              : <MapPin className="h-3 w-3 flex-shrink-0 text-[#1D9E75]" />
          }
          <span className="line-clamp-1">
            {item.seller_name ?? (isExporter ? "Exportador verificado" : "Productor verificado")}
            {item.seller_region ? ` · ${item.seller_region}` : ""}
          </span>
        </div>

        <div className="space-y-1 mb-3">
          {item.volume_tm != null && (
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <Truck className="h-3 w-3 text-gray-400 flex-shrink-0" />
              {item.volume_tm} {item.volume_label} disponibles
            </div>
          )}
          {item.ref_price_fob_usd != null && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#085041]">
              <DollarSign className="h-3 w-3 flex-shrink-0" />
              USD {item.ref_price_fob_usd} / {item.price_unit}
              <span className="text-[#6B7280] font-normal text-[10px]">FOB ref.</span>
            </div>
          )}
        </div>

        {item.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-2">
            {item.certifications.slice(0, 3).map((c) => (
              <span key={c} className="text-[9px] font-semibold bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full">
                {c}
              </span>
            ))}
            {item.certifications.length > 3 && (
              <span className="text-[9px] font-semibold bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-full">
                +{item.certifications.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={`px-4 py-2.5 border-t border-gray-100 transition-colors ${
        isExporter ? "bg-gray-50 group-hover:bg-blue-50" : "bg-gray-50 group-hover:bg-[#E1F5EE]"
      }`}>
        <span className={`text-xs font-semibold ${isExporter ? "text-blue-600" : "text-[#1D9E75]"}`}>
          Ver detalles →
        </span>
      </div>
    </Link>
  );
}

/* ─── Skeleton card ───────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-100" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
        <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
        <div className="h-3 bg-gray-100 rounded-lg w-2/3" />
        <div className="h-3 bg-gray-100 rounded-lg w-1/3" />
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function CatalogoPage() {
  const [items,   setItems]   = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterRegion,   setFilterRegion]   = useState("");
  const [filterCert,     setFilterCert]     = useState("");
  const [filterTipo,     setFilterTipo]     = useState<"" | "productor" | "exportador">("");
  const [sortBy, setSortBy] = useState("newest");
  const [navOpen,     setNavOpen]     = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Fetch both tables in parallel
      const [{ data: prods }, { data: expProds }] = await Promise.all([
        supabase.from("products").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("exporter_products").select("*").eq("status", "active").order("created_at", { ascending: false }),
      ]);

      // Collect all owner IDs for profile lookup
      const producerIds  = [...new Set((prods ?? []).map((p) => p.producer_id).filter(Boolean))];
      const exporterIds  = [...new Set((expProds ?? []).map((p) => p.exporter_id).filter(Boolean))];
      const allOwnerIds  = [...new Set([...producerIds, ...exporterIds])];

      const { data: profilesData } = allOwnerIds.length > 0
        ? await supabase.from("profiles").select("user_id, name, region, rating, country").in("user_id", allOwnerIds)
        : { data: [] };

      const pMap = new Map((profilesData ?? []).map((p) => [p.user_id, p]));

      const producerItems: CatalogItem[] = (prods ?? []).map((p) => ({
        id:               p.id,
        tipo:             "productor",
        name:             p.name,
        variety:          p.variety    ?? null,
        category:         p.category,
        description:      p.description ?? null,
        ref_price_fob_usd: p.ref_price_fob_usd ?? null,
        price_unit:       p.price_unit ?? "kg",
        months_num:       normalizeProducerMonths(p.available_months ?? []),
        certifications:   p.certifications ?? [],
        photos:           p.photos ?? [],
        created_at:       p.created_at,
        owner_id:         p.producer_id,
        volume_tm:        p.monthly_volume_tm ?? null,
        volume_label:     "TM/mes",
        seller_name:      pMap.get(p.producer_id)?.name    ?? null,
        seller_region:    pMap.get(p.producer_id)?.region  ?? null,
        seller_rating:    pMap.get(p.producer_id)?.rating  ?? null,
        seller_country:   pMap.get(p.producer_id)?.country ?? null,
      }));

      const exporterItems: CatalogItem[] = (expProds ?? []).map((p) => ({
        id:               p.id,
        tipo:             "exportador",
        name:             p.product_name,
        variety:          p.variety    ?? null,
        category:         p.category,
        description:      p.description ?? null,
        ref_price_fob_usd: p.ref_price_fob_usd ?? null,
        price_unit:       p.price_unit ?? "kg",
        months_num:       normalizeExporterMonths(p.available_months ?? []),
        certifications:   p.certifications ?? [],
        photos:           p.photos ?? [],
        created_at:       p.created_at,
        owner_id:         p.exporter_id,
        volume_tm:        p.annual_volume_tm ?? null,
        volume_label:     "TM/año",
        seller_name:      pMap.get(p.exporter_id)?.name    ?? null,
        seller_region:    pMap.get(p.exporter_id)?.region  ?? null,
        seller_rating:    pMap.get(p.exporter_id)?.rating  ?? null,
        seller_country:   pMap.get(p.exporter_id)?.country ?? null,
      }));

      // Merge and sort by newest
      setItems(
        [...producerItems, ...exporterItems].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setLoading(false);
    }
    load();
  }, []);

  const allRegions = useMemo(
    () => [...new Set(items.map((p) => p.seller_region).filter(Boolean) as string[])].sort(),
    [items],
  );
  const allCerts = useMemo(
    () => [...new Set(items.flatMap((p) => p.certifications))].sort(),
    [items],
  );

  const filtered = useMemo(() => {
    let r = [...items];
    const q = search.toLowerCase();
    if (q)
      r = r.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.variety ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    if (filterTipo)     r = r.filter((p) => p.tipo === filterTipo);
    if (filterCategory) r = r.filter((p) => p.category === filterCategory);
    if (filterRegion)   r = r.filter((p) => p.seller_region === filterRegion);
    if (filterCert)     r = r.filter((p) => p.certifications.includes(filterCert));

    if (sortBy === "price_asc")  r.sort((a, b) => (a.ref_price_fob_usd ?? 99999) - (b.ref_price_fob_usd ?? 99999));
    if (sortBy === "price_desc") r.sort((a, b) => (b.ref_price_fob_usd ?? 0) - (a.ref_price_fob_usd ?? 0));
    if (sortBy === "volume")     r.sort((a, b) => (b.volume_tm ?? 0) - (a.volume_tm ?? 0));
    return r;
  }, [items, search, filterTipo, filterCategory, filterRegion, filterCert, sortBy]);

  const activeFilters = [filterCategory, filterRegion, filterCert].filter(Boolean).length;
  const clearFilters = () => {
    setSearch(""); setFilterCategory(""); setFilterRegion(""); setFilterCert(""); setFilterTipo("");
  };

  const producerCount  = items.filter((i) => i.tipo === "productor").length;
  const exporterCount  = items.filter((i) => i.tipo === "exportador").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="/images/markaru-logo.png" alt="MARKARU" className="h-8 w-auto object-contain" />
            <span className="font-bold text-sm text-gray-900 hidden sm:block">
              MARKARU
            </span>
          </Link>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent bg-gray-50 focus:bg-white transition"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <Link href="/directorio" className="text-xs font-medium text-gray-600 hover:text-[#1D9E75] transition-colors">Directorio</Link>
            <PublicNavAuthSection />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setNavOpen(v => !v)}
            className="md:hidden flex-shrink-0 p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Menú"
          >
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {navOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1">
            {[
              { href: "/catalogo",       label: "Catálogo" },
              { href: "/directorio",     label: "Directorio" },
              { href: "/#como-funciona", label: "Cómo funciona" },
              { href: "/#planes",        label: "Planes" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setNavOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-[#E1F5EE] hover:text-[#085041] transition-colors">
                {label}
              </Link>
            ))}
            <PublicNavAuthSection mobile onNavigate={() => setNavOpen(false)} />
          </div>
        )}
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page header */}
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-[#085041]">Catálogo de productos</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Oferta agrícola disponible para exportación · América Latina
          </p>
        </div>

        {/* Tipo segmented control */}
        <div className="flex items-center gap-2 mb-4">
          {(["", "productor", "exportador"] as const).map((t) => {
            const label = t === "" ? `Ver todo (${items.length})`
              : t === "productor" ? `Productor directo (${producerCount})`
              : `Exportador (${exporterCount})`;
            const active = filterTipo === t;
            return (
              <button key={t} onClick={() => setFilterTipo(t)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  active
                    ? t === "exportador"
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-[#085041] border-[#085041] text-white"
                    : "bg-white border-gray-200 text-[#6B7280] hover:border-gray-400"
                }`}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 mb-6">
          {/* Mobile: toggle row */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
              Filtros{activeFilters > 0 ? ` (${activeFilters})` : ""}
            </button>
            <div className="relative flex-1">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-[#1E293B] focus:outline-none focus:border-[#1D9E75] cursor-pointer">
                <option value="newest">Más reciente</option>
                <option value="price_asc">Precio ↑</option>
                <option value="price_desc">Precio ↓</option>
                <option value="volume">Mayor volumen</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Filters — always visible on desktop, collapsible on mobile */}
          <div className={`${filtersOpen ? "block" : "hidden"} md:block mt-3 md:mt-0`}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-[#1E293B] focus:outline-none focus:border-[#1D9E75] cursor-pointer">
                  <option value="">Todas las categorías</option>
                  {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>

              {allRegions.length > 0 && (
                <div className="relative">
                  <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-[#1E293B] focus:outline-none focus:border-[#1D9E75] cursor-pointer">
                    <option value="">Todas las regiones</option>
                    {allRegions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
              )}

              {allCerts.length > 0 && (
                <div className="relative">
                  <select value={filterCert} onChange={(e) => setFilterCert(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-[#1E293B] focus:outline-none focus:border-[#1D9E75] cursor-pointer">
                    <option value="">Cualquier certificación</option>
                    {allCerts.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
              )}

              {(activeFilters > 0 || filterTipo) && (
                <button onClick={clearFilters}
                  className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
                  <X className="h-3.5 w-3.5" /> Limpiar
                </button>
              )}

              {/* Sort — desktop only here, mobile has it above */}
              <div className="relative ml-auto hidden md:block">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-[#1E293B] focus:outline-none focus:border-[#1D9E75] cursor-pointer">
                  <option value="newest">Más reciente</option>
                  <option value="price_asc">Precio: menor → mayor</option>
                  <option value="price_desc">Precio: mayor → menor</option>
                  <option value="volume">Mayor volumen</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <p className="text-xs text-[#6B7280] mt-2.5">
            {loading
              ? "Cargando productos..."
              : `${filtered.length} producto${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Grid / states */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center">
            <div className="w-16 h-16 bg-[#E1F5EE] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-[#1D9E75]" />
            </div>
            <h3 className="text-base font-bold text-[#085041] mb-1">
              {search || activeFilters > 0 || filterTipo ? "Sin resultados para esa búsqueda" : "Catálogo vacío por ahora"}
            </h3>
            <p className="text-sm text-[#6B7280] max-w-xs mx-auto mb-5">
              {search || activeFilters > 0 || filterTipo
                ? "Prueba con otros filtros o términos."
                : "Pronto los productores y exportadores publicarán sus productos aquí."}
            </p>
            {(search || activeFilters > 0 || filterTipo) ? (
              <button onClick={clearFilters}
                className="text-xs font-semibold text-[#1D9E75] hover:underline">
                Ver todos los productos
              </button>
            ) : (
              <Link href="/register?rol=productor"
                className="inline-block bg-[#1D9E75] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#085041] transition-colors">
                Publicar mis productos
              </Link>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item) => <ProductCard key={`${item.tipo}-${item.id}`} item={item} />)}
          </div>
        )}

        {/* Bottom CTA */}
        {!loading && (
          <div className="mt-12 bg-[#085041] rounded-2xl p-8 text-center">
            <h3 className="text-xl font-extrabold text-white mb-2">¿Produces o exportas?</h3>
            <p className="text-sm text-white/75 mb-5 max-w-md mx-auto">
              Publica tu catálogo y llega a compradores internacionales. Gratis para empezar.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/register?rol=productor"
                className="inline-block bg-[#1D9E75] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#2dd4a0] transition-colors shadow-lg">
                Soy productor
              </Link>
              <Link href="/register?rol=exportador"
                className="inline-block bg-white text-[#085041] px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors shadow-lg">
                Soy exportador
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
