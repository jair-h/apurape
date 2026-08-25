"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, MapPin, Star, MessageCircle,
  Package, Filter, ChevronDown, Award, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Types ───────────────────────────────────────────────── */

interface Producer {
  user_id: string;
  name: string | null;
  business_name: string | null;
  region: string | null;
  country: string | null;
  verified: boolean;
  rating: number | null;
  operations_count: number | null;
  main_product: string | null;
  certifications: string[] | null;
  farm_name: string | null;
  annual_production_tm: number | null;
}

const VOLUMES = [
  { label: "Cualquier producción", value: 0 },
  { label: "Mín. 5 TM/año",  value: 5 },
  { label: "Mín. 10 TM/año", value: 10 },
  { label: "Mín. 20 TM/año", value: 20 },
  { label: "Mín. 50 TM/año", value: 50 },
];

/* ─── Stars ───────────────────────────────────────────────── */

function Stars({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s}
          className={`h-3 w-3 ${s <= Math.round(r) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} />
      ))}
    </div>
  );
}

/* ─── Producer card ───────────────────────────────────────── */

function ProducerCard({ producer, onContact }: { producer: Producer; onContact: (userId: string) => void }) {
  const initial     = (producer.business_name ?? producer.name ?? "?").charAt(0).toUpperCase();
  const displayName = producer.business_name ?? producer.name ?? "Productor";
  const certs       = producer.certifications ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#085041] flex items-center justify-center text-white text-base font-extrabold flex-shrink-0 relative">
          {initial}
          {producer.verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1D9E75] rounded-full flex items-center justify-center border-2 border-white">
              <Award className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-[#085041] truncate">{displayName}</h3>
          {producer.name && producer.business_name && (
            <p className="text-[11px] text-[#6B7280] truncate">{producer.name}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <Stars rating={producer.rating} />
            {producer.rating != null && (
              <span className="text-[10px] text-[#6B7280]">
                {producer.rating.toFixed(1)}
                {producer.operations_count ? ` · ${producer.operations_count} ops` : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="px-5 pb-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
        {producer.main_product && (
          <div className="flex items-center gap-1.5 text-[#6B7280]">
            <Package className="h-3.5 w-3.5 text-[#1D9E75] flex-shrink-0" />
            <span className="font-semibold text-[#1E293B] truncate">{producer.main_product}</span>
          </div>
        )}
        {(producer.region || producer.country) && (
          <div className="flex items-center gap-1.5 text-[#6B7280]">
            <MapPin className="h-3.5 w-3.5 text-[#1D9E75] flex-shrink-0" />
            <span className="truncate">{[producer.region, producer.country].filter(Boolean).join(", ")}</span>
          </div>
        )}
        {(producer.farm_name || producer.annual_production_tm) && (
          <div className="col-span-2 text-[#6B7280]">
            {producer.farm_name && (
              <>Finca: <span className="font-semibold text-[#1E293B]">{producer.farm_name}</span></>
            )}
            {producer.farm_name && producer.annual_production_tm && <span className="mx-2">·</span>}
            {producer.annual_production_tm != null && (
              <>Prod: <span className="font-semibold text-[#1D9E75]">{producer.annual_production_tm} TM/año</span></>
            )}
          </div>
        )}
      </div>

      {/* Certifications */}
      {certs.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {certs.map((c) => (
            <span key={c} className="text-[10px] font-semibold bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full">
              {c}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="px-5 pb-5 mt-auto">
        <button
          type="button"
          onClick={() => onContact(producer.user_id)}
          className="w-full py-2.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          Contactar
        </button>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function BuscarProductoresPage() {
  const router = useRouter();
  const [producers, setProducers]     = useState<Producer[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [regionFilter, setRegionFilter]   = useState("");
  const [certFilter, setCertFilter]       = useState("");
  const [volumeFilter, setVolumeFilter]   = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [profilesRes, ppRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, name, business_name, region, country, verified, rating, operations_count")
          .eq("role", "productor"),
        supabase
          .from("producer_profiles")
          .select("user_id, main_product, certifications, farm_name, annual_production_tm, region"),
      ]);

      const profiles = profilesRes.data ?? [];
      const ppMap: Record<string, { main_product: string | null; certifications: string[] | null; farm_name: string | null; annual_production_tm: number | null; region: string | null }> = {};
      for (const pp of (ppRes.data ?? [])) ppMap[pp.user_id] = pp;

      setProducers(
        profiles.map((p) => {
          const pp = ppMap[p.user_id];
          return {
            user_id:             p.user_id,
            name:                p.name,
            business_name:       p.business_name,
            region:              pp?.region ?? p.region,
            country:             p.country,
            verified:            p.verified ?? false,
            rating:              p.rating,
            operations_count:    p.operations_count,
            main_product:        pp?.main_product ?? null,
            certifications:      pp?.certifications ?? null,
            farm_name:           pp?.farm_name ?? null,
            annual_production_tm: pp?.annual_production_tm ?? null,
          };
        })
      );
      setLoading(false);
    }
    load();
  }, []);

  const allProducts = useMemo(() => [...new Set(producers.map((p) => p.main_product).filter(Boolean) as string[])], [producers]);
  const allRegions  = useMemo(() => [...new Set(producers.map((p) => p.region).filter(Boolean) as string[])], [producers]);
  const allCerts    = useMemo(() => [...new Set(producers.flatMap((p) => p.certifications ?? []))], [producers]);

  const filtered = useMemo(() =>
    producers
      .filter((p) => {
        const q = search.toLowerCase();
        const matchSearch = !search ||
          (p.name ?? "").toLowerCase().includes(q) ||
          (p.business_name ?? "").toLowerCase().includes(q) ||
          (p.main_product ?? "").toLowerCase().includes(q) ||
          (p.farm_name ?? "").toLowerCase().includes(q);
        const matchProduct = !productFilter || p.main_product === productFilter;
        const matchRegion  = !regionFilter  || p.region === regionFilter;
        const matchCert    = !certFilter    || (p.certifications ?? []).includes(certFilter);
        const matchVolume  = !volumeFilter  || (p.annual_production_tm ?? 0) >= volumeFilter;
        return matchSearch && matchProduct && matchRegion && matchCert && matchVolume;
      })
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
  [producers, search, productFilter, regionFilter, certFilter, volumeFilter]);

  const handleContact = (userId: string) => {
    router.push(`/dashboard/mensajes?contact=${userId}`);
  };

  const selectCls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-[#1E293B] focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all";
  const activeFilters = [productFilter, regionFilter, certFilter, volumeFilter > 0].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#085041]">Buscar productores</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Encuentra productores verificados con los productos y certificaciones que necesitas.
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, empresa, producto..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-[#1E293B] placeholder:text-gray-400 focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              showFilters || activeFilters > 0
                ? "bg-[#085041] text-white border-[#085041]"
                : "bg-white border-gray-200 text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75]"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFilters > 0 && (
              <span className="bg-white/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeFilters}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 shadow-sm">
            <div>
              <label className="block text-[10px] font-bold text-[#085041] mb-1.5 uppercase tracking-wider">Producto</label>
              <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className={selectCls}>
                <option value="">Todos</option>
                {allProducts.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#085041] mb-1.5 uppercase tracking-wider">Región</label>
              <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={selectCls}>
                <option value="">Todas</option>
                {allRegions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#085041] mb-1.5 uppercase tracking-wider">Certificación</label>
              <select value={certFilter} onChange={(e) => setCertFilter(e.target.value)} className={selectCls}>
                <option value="">Cualquiera</option>
                {allCerts.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#085041] mb-1.5 uppercase tracking-wider">Producción anual</label>
              <select value={volumeFilter} onChange={(e) => setVolumeFilter(Number(e.target.value))} className={selectCls}>
                {VOLUMES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            {activeFilters > 0 && (
              <div className="col-span-2 md:col-span-4 flex justify-end">
                <button type="button"
                  onClick={() => { setProductFilter(""); setRegionFilter(""); setCertFilter(""); setVolumeFilter(0); }}
                  className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors">
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#6B7280]">
          <span className="font-bold text-[#085041]">{filtered.length}</span> productor{filtered.length !== 1 ? "es" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
        </p>
        <p className="text-[10px] text-[#6B7280]">Ordenado por calificación</p>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#085041]">
            {producers.length === 0 ? "No hay productores registrados aún" : "Sin resultados"}
          </p>
          <p className="text-xs text-[#6B7280] mt-1">
            {producers.length === 0
              ? "Los productores que se registren en la plataforma aparecerán aquí."
              : "Intenta con otros filtros o amplía tu búsqueda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-6">
          {filtered.map((p) => (
            <ProducerCard key={p.user_id} producer={p} onContact={handleContact} />
          ))}
        </div>
      )}
    </div>
  );
}

