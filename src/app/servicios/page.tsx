"use client";

/* Buscador público de servicios. Reemplaza a /catalogo (productos agro)
 * y a /directorio (actores de la cadena agroexportadora). */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, Star, Wrench, Loader2, CheckCircle2, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase";
import PublicNavAuthSection from "@/components/PublicNavAuthSection";

interface Category { id: string; slug: string; name: string; }

interface ServiceRow {
  id: string; title: string; description: string | null;
  price_from: number | null; price_unit: string | null;
  photos: string[]; works_remote: boolean; featured_until: string | null;
  coverage_districts: string[];
  provider_id: string;
  service_categories: { name: string; slug: string } | null;
  profiles: {
    name: string | null; business_name: string | null;
    rating: number | null; ratings_count: number | null;
    verified: boolean | null; district: string | null;
  } | null;
}

const PRICE_UNIT_LABEL: Record<string, string> = {
  hora: "hora", servicio: "servicio", dia: "día", m2: "m²", punto: "punto", mes: "mes",
};

function ServiceCard({ s }: { s: ServiceRow }) {
  const provider = s.profiles;
  const providerName = provider?.business_name || provider?.name || "Proveedor";
  const featured = s.featured_until && new Date(s.featured_until) > new Date();

  return (
    <Link href={`/perfil/${s.provider_id}`}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col">
      <div className="relative aspect-[4/3] bg-red-50 overflow-hidden">
        {s.photos?.[0]
          ? <img src={s.photos[0]} alt={s.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Wrench className="h-10 w-10 text-[#D92D20]/25" /></div>}
        {featured && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-[#D92D20] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
            <Trophy className="h-2.5 w-2.5" /> Destacado
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-sm font-bold text-gray-900 line-clamp-2">{s.title}</p>
        {s.service_categories && (
          <p className="text-[11px] text-[#6B7280] mt-0.5">{s.service_categories.name}</p>
        )}

        <div className="flex items-center gap-1.5 mt-2">
          <p className="text-xs font-semibold text-gray-700 truncate">{providerName}</p>
          {provider?.verified && <CheckCircle2 className="h-3 w-3 text-[#0E9384] flex-shrink-0" />}
        </div>

        {provider?.ratings_count ? (
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            <span className="text-[11px] text-[#6B7280]">
              {Number(provider.rating).toFixed(1)} ({provider.ratings_count})
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-gray-400 mt-1">Sin reseñas aún</p>
        )}

        {(s.coverage_districts?.length > 0 || provider?.district) && (
          <p className="flex items-center gap-1 text-[11px] text-[#6B7280] mt-1.5">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              {s.coverage_districts?.length > 0 ? s.coverage_districts.slice(0, 2).join(", ") : provider?.district}
              {s.works_remote && " · a distancia"}
            </span>
          </p>
        )}

        {s.price_from != null && (
          <p className="text-sm font-bold text-[#D92D20] mt-auto pt-3">
            Desde S/ {Number(s.price_from).toLocaleString("es-PE")}
            {s.price_unit && <span className="text-[#6B7280] font-normal text-xs"> / {PRICE_UNIT_LABEL[s.price_unit] ?? s.price_unit}</span>}
          </p>
        )}
      </div>
    </Link>
  );
}

function ServiciosInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const catParam = searchParams.get("categoria") ?? "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices]     = useState<ServiceRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [query, setQuery]           = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("service_categories").select("id, slug, name")
      .eq("active", true).order("order_num")
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);

    let q = supabase
      .from("provider_services")
      .select("id, title, description, price_from, price_unit, photos, works_remote, featured_until, coverage_districts, provider_id, service_categories(name, slug), profiles(name, business_name, rating, ratings_count, verified, district)")
      .eq("status", "activo")
      .order("featured_until", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(60);

    if (catParam) {
      const cat = categories.find(c => c.slug === catParam);
      if (cat) q = q.eq("category_id", cat.id);
    }

    q.then(({ data }) => {
      setServices((data as unknown as ServiceRow[]) ?? []);
      setLoading(false);
    });
  }, [catParam, categories]);

  const filtered = services.filter(s => {
    if (!query.trim()) return true;
    const t = query.toLowerCase();
    const provider = s.profiles?.business_name || s.profiles?.name || "";
    return s.title.toLowerCase().includes(t)
      || (s.description ?? "").toLowerCase().includes(t)
      || provider.toLowerCase().includes(t)
      || s.coverage_districts?.some(d => d.toLowerCase().includes(t));
  });

  const setCategory = (slug: string) => {
    router.push(slug ? `/servicios?categoria=${slug}` : "/servicios");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-extrabold text-base text-[#D92D20]">Apurape</span>
            <span className="hidden sm:block text-[11px] text-[#6B7280]">Tú me ayudas, yo te ayudo</span>
          </Link>
          <PublicNavAuthSection />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Encuentra a quien te ayude</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Proveedores de servicios en tu zona. Pide cotización sin costo.
          </p>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="¿Qué necesitas? Ej. gasfitero, fotógrafo, clases de inglés…"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent shadow-sm" />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button type="button" onClick={() => setCategory("")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${!catParam ? "bg-[#D92D20] text-white border-[#D92D20]" : "bg-white text-[#6B7280] border-gray-200 hover:border-[#D92D20]"}`}>
            Todas
          </button>
          {categories.map(c => (
            <button key={c.id} type="button" onClick={() => setCategory(c.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${catParam === c.slug ? "bg-[#D92D20] text-white border-[#D92D20]" : "bg-white text-[#6B7280] border-gray-200 hover:border-[#D92D20]"}`}>
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 text-[#D92D20] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
            <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-900">Todavía no hay servicios publicados aquí</p>
            <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto leading-relaxed">
              Publica lo que necesitas y deja que los proveedores te coticen a ti.
            </p>
            <Link href="/dashboard/cliente/solicitud/nueva"
              className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#D92D20] text-white text-xs font-bold hover:bg-[#B42318] transition-colors">
              Publicar una solicitud
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-[#6B7280] mb-3">{filtered.length} {filtered.length === 1 ? "servicio" : "servicios"}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(s => <ServiceCard key={s.id} s={s} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ServiciosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-7 w-7 text-[#D92D20] animate-spin" />
      </div>
    }>
      <ServiciosInner />
    </Suspense>
  );
}
