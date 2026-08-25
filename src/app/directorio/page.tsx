"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, MapPin, Star, Award,
  Truck, Globe, Sprout, Building2, Users,
  ChevronDown, X, Package, MessageCircle, Loader2, Menu,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { findOrCreateConversation } from "@/lib/conversations";
import PublicNavAuthSection from "@/components/PublicNavAuthSection";
import { FlagImg } from "@/components/FlagImg";

/* ─── Role config ─────────────────────────────────────────── */

const ROLE_CONFIG: Record<string, {
  label: string;
  plural: string;
  color: string;
  bg: string;
  Icon: React.ElementType;
}> = {
  productor:    { label: "Productor",    plural: "Productores",    color: "text-[#085041]",    bg: "bg-[#E1F5EE]",      Icon: Sprout    },
  exportador:   { label: "Exportador",   plural: "Exportadores",   color: "text-blue-700",     bg: "bg-blue-100",       Icon: Globe     },
  forwarder:    { label: "Forwarder",    plural: "Forwarders",     color: "text-orange-700",   bg: "bg-orange-100",     Icon: Truck     },
  certificadora:{ label: "Certificadora",plural: "Certificadoras", color: "text-purple-700",   bg: "bg-purple-100",     Icon: Award     },
  banco:        { label: "Banco",        plural: "Bancos",         color: "text-amber-700",    bg: "bg-amber-100",      Icon: Building2 },
  comprador:    { label: "Comprador",    plural: "Compradores",    color: "text-pink-700",     bg: "bg-pink-100",       Icon: Package   },
};

const ROLE_TABS = [
  { key: "",             label: "Todos"         },
  { key: "productor",    label: "Productores"   },
  { key: "exportador",   label: "Exportadores"  },
  { key: "comprador",    label: "Compradores"   },
  { key: "forwarder",    label: "Forwarders"    },
  { key: "certificadora",label: "Certificadoras"},
];

/* ─── Types ───────────────────────────────────────────────── */

interface Actor {
  user_id: string;
  name: string | null;
  business_name: string | null;
  role: string;
  region: string | null;
  country: string | null;
  rating: number | null;
  verified: boolean | null;
  operations_count: number | null;
  // enriched from role tables
  tags: string[];        // products / service_types / routes
  certifications: string[];
  description: string | null;
  farm_name: string | null;
}

/* ─── Helpers ─────────────────────────────────────────────── */

function renderStars(rating: number) {
  return Array.from({ length: 5 }).map((_, i) => (
    <Star
      key={i}
      className={`h-3 w-3 ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`}
    />
  ));
}

function displayName(actor: Actor): string {
  return actor.farm_name ?? actor.business_name ?? actor.name ?? "Sin nombre";
}

function avatarInitial(actor: Actor): string {
  const n = displayName(actor);
  return n.charAt(0).toUpperCase();
}

/* ─── Actor card ──────────────────────────────────────────── */

function ActorCard({
  actor,
  currentUserId,
  onContact,
  contacting,
}: {
  actor: Actor;
  currentUserId: string | null;
  onContact: (targetId: string) => void;
  contacting: string | null;
}) {
  const cfg = ROLE_CONFIG[actor.role];
  if (!cfg) return null;
  const { Icon } = cfg;
  const canContact = currentUserId && currentUserId !== actor.user_id;
  const isContacting = contacting === actor.user_id;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <Link
        href={`/perfil/${actor.user_id}`}
        className="flex flex-col p-5 flex-1 group"
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
            <span className={`text-lg font-extrabold ${cfg.color}`}>{avatarInitial(actor)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <h3 className="text-sm font-bold text-[#085041] group-hover:text-[#1D9E75] transition-colors line-clamp-1">
                {displayName(actor)}
              </h3>
              {actor.verified && (
                <Award className="h-3.5 w-3.5 text-[#1D9E75] flex-shrink-0 mt-0.5" />
              )}
            </div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${cfg.bg} ${cfg.color}`}>
              <Icon className="h-2.5 w-2.5" />
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Location */}
        {(actor.region || actor.country) && (
          <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-3">
            {actor.country
              ? <FlagImg countryName={actor.country} />
              : <MapPin className="h-3 w-3 text-[#1D9E75] flex-shrink-0" />
            }
            <span className="truncate">{[actor.region, actor.country].filter(Boolean).join(", ")}</span>
          </div>
        )}

        {/* Description */}
        {actor.description && (
          <p className="text-xs text-[#6B7280] leading-relaxed line-clamp-2 mb-3">
            {actor.description}
          </p>
        )}

        {/* Tags */}
        {actor.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {actor.tags.slice(0, 4).map((t) => (
              <span key={t} className="text-[9px] font-semibold bg-gray-100 text-[#4B5563] px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
            {actor.tags.length > 4 && (
              <span className="text-[9px] font-semibold bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-full">
                +{actor.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Certifications */}
        {actor.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {actor.certifications.slice(0, 3).map((c) => (
              <span key={c} className="text-[9px] font-semibold bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full">
                {c}
              </span>
            ))}
            {actor.certifications.length > 3 && (
              <span className="text-[9px] font-semibold bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-full">
                +{actor.certifications.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer: rating */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {actor.rating != null && actor.rating > 0 ? (
              <>
                <div className="flex items-center gap-0.5">{renderStars(actor.rating)}</div>
                <span className="text-[11px] font-semibold text-[#1E293B]">{Number(actor.rating).toFixed(1)}</span>
              </>
            ) : (
              <span className="text-[10px] text-[#6B7280]">Sin calificación aún</span>
            )}
          </div>
          {actor.operations_count != null && actor.operations_count > 0 && (
            <span className="text-[10px] text-[#6B7280]">{actor.operations_count} ops.</span>
          )}
        </div>
      </Link>

      {/* Contact button — only for logged-in users who aren't viewing their own card */}
      {canContact && (
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={() => onContact(actor.user_id)}
            disabled={isContacting}
            className="w-full flex items-center justify-center gap-2 bg-[#085041] text-white py-2 rounded-xl text-xs font-bold hover:bg-[#1D9E75] transition-colors disabled:opacity-60"
          >
            {isContacting
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Abriendo chat...</>
              : <><MessageCircle className="h-3.5 w-3.5" /> Contactar</>}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton ────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function DirectorioPage() {
  const router = useRouter();
  const [actors,  setActors]  = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [roleTab, setRoleTab] = useState("");
  const [filterCountry,  setFilterCountry]  = useState("");
  const [filterRegion,   setFilterRegion]   = useState("");
  const [currentUserId,  setCurrentUserId]  = useState<string | null>(null);
  const [contacting,     setContacting]     = useState<string | null>(null);
  const [navOpen,        setNavOpen]        = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const handleContact = async (targetId: string) => {
    if (!currentUserId) { router.push("/login"); return; }
    setContacting(targetId);
    const convId = await findOrCreateConversation(currentUserId, targetId);
    router.push(convId ? `/dashboard/mensajes?conv=${convId}` : "/dashboard/mensajes");
    setContacting(null);
  };

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      /* 1 — All public profiles (exclude admin) */
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, business_name, role, region, country, rating, verified, operations_count")
        .in("role", ["productor", "exportador", "forwarder", "certificadora", "banco", "comprador"])
        .order("rating", { ascending: false });

      if (!profiles?.length) { setLoading(false); return; }

      const ids = profiles.map((p) => p.user_id);

      /* 2 — Role-specific tables (parallel) */
      const [{ data: pps }, { data: eps }, { data: fps }] = await Promise.all([
        supabase
          .from("producer_profiles")
          .select("user_id, farm_name, products, certifications, description")
          .in("user_id", ids),
        supabase
          .from("exporter_profiles")
          .select("user_id, products, certifications, description, razon_social")
          .in("user_id", ids),
        supabase
          .from("forwarder_profiles")
          .select("user_id, service_types, routes")
          .in("user_id", ids),
      ]);

      const ppMap  = new Map((pps  ?? []).map((r) => [r.user_id, r]));
      const epMap  = new Map((eps  ?? []).map((r) => [r.user_id, r]));
      const fpMap  = new Map((fps  ?? []).map((r) => [r.user_id, r]));

      const merged: Actor[] = profiles.map((p) => {
        const pp = ppMap.get(p.user_id);
        const ep = epMap.get(p.user_id);
        const fp = fpMap.get(p.user_id);

        let tags: string[] = [];
        let certifications: string[] = [];
        let description: string | null = null;
        let farm_name: string | null = null;
        let business_name: string | null = p.business_name ?? null;

        if (pp) {
          tags          = Array.isArray(pp.products)      ? pp.products      : [];
          certifications= Array.isArray(pp.certifications)? pp.certifications : [];
          description   = pp.description ?? null;
          farm_name     = pp.farm_name   ?? null;
        } else if (ep) {
          tags          = Array.isArray(ep.products)      ? ep.products      : [];
          certifications= Array.isArray(ep.certifications)? ep.certifications : [];
          description   = ep.description ?? null;
          if (ep.razon_social) business_name = ep.razon_social;
        } else if (fp) {
          tags = [
            ...(Array.isArray(fp.service_types) ? fp.service_types : []),
            ...(Array.isArray(fp.routes)         ? fp.routes.slice(0, 2) : []),
          ];
        }

        return {
          user_id:          p.user_id,
          name:             p.name            ?? null,
          business_name,
          role:             p.role,
          region:           p.region          ?? null,
          country:          p.country         ?? null,
          rating:           p.rating          ?? null,
          verified:         p.verified        ?? null,
          operations_count: p.operations_count ?? null,
          tags,
          certifications,
          description,
          farm_name,
        };
      });

      setActors(merged);
      setLoading(false);
    }
    load();
  }, []);

  /* Derived filter options */
  const allCountries = useMemo(
    () => [...new Set(actors.map((a) => a.country).filter(Boolean) as string[])].sort(),
    [actors],
  );
  const allRegions = useMemo(() => {
    const base = actors.filter((a) => !filterCountry || a.country === filterCountry);
    return [...new Set(base.map((a) => a.region).filter(Boolean) as string[])].sort();
  }, [actors, filterCountry]);

  /* Filtered list */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return actors.filter((a) => {
      if (roleTab    && a.role    !== roleTab)    return false;
      if (filterCountry && a.country !== filterCountry) return false;
      if (filterRegion  && a.region  !== filterRegion)  return false;
      if (q) {
        const haystack = [
          a.name, a.business_name, a.farm_name,
          a.region, a.country, ...a.tags,
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [actors, roleTab, filterCountry, filterRegion, search]);

  const activeFilters = [filterCountry, filterRegion].filter(Boolean).length;

  /* Counts per role */
  const counts = useMemo(() => {
    const base = actors;
    return Object.fromEntries(
      ROLE_TABS.map((t) => [
        t.key,
        t.key ? base.filter((a) => a.role === t.key).length : base.length,
      ]),
    );
  }, [actors]);

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

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, producto..."
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
            <Link href="/catalogo" className="text-xs font-medium text-gray-600 hover:text-[#1D9E75] transition-colors">Catálogo</Link>
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
          <h1 className="text-2xl font-extrabold text-[#085041]">Directorio de empresas</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Productores, exportadores, forwarders y más actores de la cadena agroexportadora
          </p>
        </div>

        {/* Role tabs — scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {ROLE_TABS.map((t) => {
            const active = roleTab === t.key;
            const cfg = t.key ? ROLE_CONFIG[t.key] : null;
            return (
              <button
                key={t.key}
                onClick={() => setRoleTab(t.key)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? "bg-[#085041] text-white border-[#085041] shadow-sm"
                    : "bg-white text-[#6B7280] border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
                }`}
              >
                {cfg && <cfg.Icon className="h-3.5 w-3.5" />}
                {t.label}
                {!loading && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-gray-100 text-[#6B7280]"}`}>
                    {counts[t.key] ?? 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary filters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Country */}
            {allCountries.length > 0 && (
              <div className="relative">
                <select
                  value={filterCountry}
                  onChange={(e) => { setFilterCountry(e.target.value); setFilterRegion(""); }}
                  className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-[#1E293B] focus:outline-none focus:border-[#1D9E75] cursor-pointer"
                >
                  <option value="">Todos los países</option>
                  {allCountries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Region */}
            {allRegions.length > 0 && (
              <div className="relative">
                <select
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-[#1E293B] focus:outline-none focus:border-[#1D9E75] cursor-pointer"
                >
                  <option value="">Todas las regiones</option>
                  {allRegions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
            )}

            {activeFilters > 0 && (
              <button
                onClick={() => { setFilterCountry(""); setFilterRegion(""); }}
                className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Limpiar ({activeFilters})
              </button>
            )}

            <p className="ml-auto text-xs text-[#6B7280]">
              {loading ? "Cargando..." : `${filtered.length} empresa${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center">
            <div className="w-16 h-16 bg-[#E1F5EE] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-[#1D9E75]" />
            </div>
            <h3 className="text-base font-bold text-[#085041] mb-1">
              {search || activeFilters > 0 ? "Sin resultados" : "Directorio vacío por ahora"}
            </h3>
            <p className="text-sm text-[#6B7280] max-w-xs mx-auto mb-5">
              {search || activeFilters > 0
                ? "Prueba con otros filtros."
                : "Pronto los actores de la cadena estarán aquí."}
            </p>
            {(search || activeFilters > 0) && (
              <button
                onClick={() => { setSearch(""); setFilterCountry(""); setFilterRegion(""); setRoleTab(""); }}
                className="text-xs font-semibold text-[#1D9E75] hover:underline"
              >
                Ver todos
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <ActorCard
                key={a.user_id}
                actor={a}
                currentUserId={currentUserId}
                onContact={handleContact}
                contacting={contacting}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        {!loading && (
          <div className="mt-12 bg-gradient-to-r from-[#085041] to-[#1D9E75] rounded-2xl p-8 text-center">
            <h3 className="text-xl font-extrabold text-white mb-2">¿Tu empresa no está aquí?</h3>
            <p className="text-sm text-white/75 mb-5 max-w-md mx-auto">
              Regístrate y aparece en el directorio. Conecta con toda la cadena agroexportadora.
            </p>
            <Link
              href="/register"
              className="inline-block bg-white text-[#085041] px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors shadow-lg"
            >
              Registrar mi empresa gratis
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
