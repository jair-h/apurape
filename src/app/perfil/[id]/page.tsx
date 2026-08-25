import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Star, Wrench, Search as SearchIcon,
  ChevronRight, CheckCircle2, Award, Trophy, Quote as QuoteIcon,
} from "lucide-react";
import { createServerSupabase } from "@/lib/supabase-server";
import PublicNavAuthSection from "@/components/PublicNavAuthSection";
import ProfileActions from "./ProfileActions";

/* ─────────────────────────────────────────────────────────────
 * Perfil público de Apurape.
 *
 * Reemplaza al perfil de MARKARU, que leía producer_profiles /
 * exporter_profiles / forwarder_profiles / products / exporter_products
 * y mostraba certificaciones agro, hectáreas, incoterms y meses de
 * cosecha. Ahora todo vive en dos tablas: provider_services (lo que
 * ofrece) y ratings (lo que dicen sus clientes).
 * ───────────────────────────────────────────────────────────── */

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.apurape.com";

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  proveedor: { label: "Proveedor", color: "text-[#D92D20]", bg: "bg-red-50",  Icon: Wrench     },
  cliente:   { label: "Cliente",   color: "text-[#0E9384]", bg: "bg-teal-50", Icon: SearchIcon },
};

const LEVEL_LABEL: Record<string, string> = {
  bronce: "Bronce", plata: "Plata", oro: "Oro", platino: "Platino",
};

const PRICE_UNIT_LABEL: Record<string, string> = {
  hora: "hora", servicio: "servicio", dia: "día", m2: "m²", punto: "punto", mes: "mes",
};

/* ─── Types ───────────────────────────────────────────────── */

interface Profile {
  id: string; name: string | null; business_name: string | null; role: string;
  account_type: string | null; bio: string | null; avatar_url: string | null;
  region: string | null; province: string | null; district: string | null; country: string | null;
  rating: number | null; ratings_count: number | null; five_star_count: number | null;
  confirmed_jobs_count: number | null; verified: boolean | null;
  plan: string | null; level: string | null; points: number | null; created_at: string;
}

interface ServiceRow {
  id: string; title: string; description: string | null;
  price_from: number | null; price_unit: string | null; currency: string;
  photos: string[]; featured_until: string | null;
  coverage_districts: string[]; works_remote: boolean;
  service_categories: { name: string; slug: string } | null;
}

interface RatingRow {
  id: string; stars: number; comment: string | null; created_at: string; rater_id: string;
  rater_name: string;
}

interface ProfileBundle {
  profile: Profile;
  services: ServiceRow[];
  ratings: RatingRow[];
}

/* ─── Data ────────────────────────────────────────────────── */

async function getProfileData(id: string): Promise<ProfileBundle | null> {
  const supabase = createServerSupabase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, business_name, role, account_type, bio, avatar_url, region, province, district, country, rating, ratings_count, five_star_count, confirmed_jobs_count, verified, plan, level, points, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!profile) return null;
  const p = profile as Profile;

  // Solo el Proveedor tiene catálogo. Las calificaciones que se
  // muestran son las que dejó un Cliente: son las que cuentan.
  const [servicesRes, ratingsRes] = await Promise.all([
    p.role === "proveedor"
      ? supabase
          .from("provider_services")
          .select("id, title, description, price_from, price_unit, currency, photos, featured_until, coverage_districts, works_remote, service_categories(name, slug)")
          .eq("provider_id", id)
          .eq("status", "activo")
          .order("featured_until", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    supabase
      .from("ratings")
      .select("id, stars, comment, created_at, rater_id")
      .eq("rated_id", id)
      .eq("direction", p.role === "proveedor" ? "cliente_a_proveedor" : "proveedor_a_cliente")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const rawRatings = (ratingsRes.data as Omit<RatingRow, "rater_name">[] | null) ?? [];

  // Nombre de quien calificó (una sola consulta para todas).
  let raterNames: Record<string, string> = {};
  if (rawRatings.length > 0) {
    const ids = [...new Set(rawRatings.map(r => r.rater_id))];
    const { data: raters } = await supabase
      .from("profiles").select("id, name, business_name").in("id", ids);
    raterNames = Object.fromEntries(
      (raters ?? []).map((r: { id: string; name: string | null; business_name: string | null }) =>
        [r.id, r.business_name || r.name || "Usuario"])
    );
  }

  return {
    profile: p,
    services: (servicesRes.data as unknown as ServiceRow[] | null) ?? [],
    ratings: rawRatings.map(r => ({ ...r, rater_name: raterNames[r.rater_id] ?? "Usuario" })),
  };
}

function nameOf(p: Profile): string {
  return p.business_name || p.name || "Perfil";
}

/* ─── SEO ─────────────────────────────────────────────────── */

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getProfileData(id);
  if (!data) return { title: "Perfil no encontrado · Apurape" };

  const displayName = nameOf(data.profile);
  const roleLabel = ROLE_CONFIG[data.profile.role]?.label ?? "";
  const loc = [data.profile.district, data.profile.region].filter(Boolean).join(", ");
  const cats = [...new Set(data.services.map(s => s.service_categories?.name).filter(Boolean))].join(", ");

  const description = data.profile.role === "proveedor"
    ? `${displayName}${loc ? ` en ${loc}` : ""}${cats ? ` — ${cats}` : ""}. Pide tu cotización en Apurape.`
    : `${displayName}${loc ? ` en ${loc}` : ""} — ${roleLabel} en Apurape.`;

  const url = `${SITE_URL}/perfil/${id}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: `${displayName}${roleLabel ? ` · ${roleLabel}` : ""} | Apurape`,
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", title: displayName, description, url },
  };
}

/* ─── Presentational helpers ──────────────────────────────── */

function renderStars(rating: number, size = "h-4 w-4") {
  return Array.from({ length: 5 }).map((_, i) => (
    <Star key={i} className={`${size} ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} />
  ));
}

function priceLabel(s: ServiceRow): string | null {
  if (s.price_from == null) return null;
  const amount = `S/ ${Number(s.price_from).toLocaleString("es-PE")}`;
  const unit = s.price_unit ? ` / ${PRICE_UNIT_LABEL[s.price_unit] ?? s.price_unit}` : "";
  return `Desde ${amount}${unit}`;
}

function ServiceCard({ service }: { service: ServiceRow }) {
  const featured = service.featured_until && new Date(service.featured_until) > new Date();
  const price = priceLabel(service);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-red-50 overflow-hidden">
        {service.photos?.[0]
          ? <img src={service.photos[0]} alt={service.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Wrench className="h-10 w-10 text-[#D92D20]/25" /></div>}
        {featured && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-[#D92D20] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            <Trophy className="h-2.5 w-2.5" /> Destacado
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs font-bold text-gray-900 line-clamp-2">{service.title}</p>
        {service.service_categories && (
          <p className="text-[10px] text-[#6B7280] mt-0.5">{service.service_categories.name}</p>
        )}
        {service.description && (
          <p className="text-[11px] text-[#6B7280] mt-1.5 line-clamp-2 leading-relaxed">{service.description}</p>
        )}
        <div className="mt-auto pt-2 space-y-0.5">
          {price && <p className="text-xs font-bold text-[#D92D20]">{price}</p>}
          {service.works_remote && <p className="text-[10px] text-[#0E9384]">También a distancia</p>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-[#D92D20]" />
        </div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ─── Page (Server Component) ─────────────────────────────── */

export default async function PerfilPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProfileData(id);
  if (!data) notFound();

  const { profile, services, ratings } = data;
  const cfg = ROLE_CONFIG[profile.role] ?? ROLE_CONFIG.cliente;
  const { Icon } = cfg;
  const displayName = nameOf(profile);
  const isProveedor = profile.role === "proveedor";
  const location = [profile.district, profile.province, profile.region, profile.country].filter(Boolean).join(", ");
  const memberSince = new Date(profile.created_at).toLocaleDateString("es-PE", { month: "long", year: "numeric" });

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex items-center gap-2 text-xs text-[#6B7280] mb-5">
          <Link href="/" className="flex items-center gap-1 hover:text-[#D92D20] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Inicio
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 font-semibold truncate">{displayName}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col items-center text-center mb-5">
                <div className={`w-20 h-20 rounded-2xl ${cfg.bg} flex items-center justify-center mb-3 shadow-sm overflow-hidden`}>
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                    : <span className={`text-3xl font-extrabold ${cfg.color}`}>{displayName.charAt(0).toUpperCase()}</span>}
                </div>
                <h1 className="text-lg font-extrabold text-gray-900 mb-1">{displayName}</h1>
                {profile.name && profile.business_name && (
                  <p className="text-xs text-[#6B7280] mb-1">{profile.name}</p>
                )}
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                  <Icon className="h-3.5 w-3.5" /> {cfg.label}
                  {profile.account_type === "negocio" && " · Negocio"}
                </span>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  {profile.verified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E9384]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verificado
                    </span>
                  )}
                  {isProveedor && profile.plan === "pro" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D92D20] text-white">
                      <Award className="h-3 w-3" /> PRO
                    </span>
                  )}
                  {!isProveedor && profile.level && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-[#0E9384]">
                      <Trophy className="h-3 w-3" /> Nivel {LEVEL_LABEL[profile.level] ?? profile.level}
                    </span>
                  )}
                </div>
              </div>

              {location && (
                <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-3 justify-center text-center">
                  <MapPin className="h-4 w-4 text-[#D92D20] flex-shrink-0" />
                  {location}
                </div>
              )}

              {profile.bio && (
                <p className="text-xs text-[#6B7280] leading-relaxed text-center mb-4">{profile.bio}</p>
              )}

              {/* Reputación */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-1">
                    {renderStars(Number(profile.rating ?? 0), "h-3 w-3")}
                  </div>
                  <p className="text-[10px] text-[#6B7280]">
                    {profile.ratings_count && profile.ratings_count > 0
                      ? `${Number(profile.rating).toFixed(1)} · ${profile.ratings_count} ${profile.ratings_count === 1 ? "reseña" : "reseñas"}`
                      : "Sin reseñas aún"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-extrabold text-gray-900">
                    {isProveedor ? (profile.confirmed_jobs_count ?? 0) : (profile.points ?? 0)}
                  </p>
                  <p className="text-[10px] text-[#6B7280]">
                    {isProveedor ? "Servicios confirmados" : "Puntos"}
                  </p>
                </div>
              </div>

              {isProveedor && (profile.five_star_count ?? 0) > 0 && (
                <p className="text-[11px] text-center text-[#6B7280] mb-4">
                  <strong className="text-amber-500">{profile.five_star_count}</strong> calificaciones de 5 estrellas
                </p>
              )}

              <ProfileActions profileUserId={profile.id} />

              <p className="text-[10px] text-center text-[#6B7280] mt-4">
                En Apurape desde {memberSince}
              </p>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="lg:col-span-2 space-y-6">
            {isProveedor && (
              <Section title={`Servicios que ofrece (${services.length})`} icon={Wrench}>
                {services.length === 0 ? (
                  <p className="text-xs text-[#6B7280] text-center py-6">
                    Este proveedor todavía no publicó servicios.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {services.map(s => <ServiceCard key={s.id} service={s} />)}
                  </div>
                )}
              </Section>
            )}

            <Section title={`Lo que dicen ${isProveedor ? "sus clientes" : "los proveedores"}`} icon={QuoteIcon}>
              {ratings.length === 0 ? (
                <p className="text-xs text-[#6B7280] text-center py-6">
                  Todavía no hay calificaciones. Las calificaciones aparecen cuando
                  {isProveedor ? " un cliente confirma un servicio." : " confirmas un servicio contratado."}
                </p>
              ) : (
                <div className="space-y-4">
                  {ratings.map(r => (
                    <div key={r.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
                            {r.rater_name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-xs font-bold text-gray-900">{r.rater_name}</p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">{renderStars(r.stars, "h-3 w-3")}</div>
                      </div>
                      {r.comment && (
                        <p className="text-xs text-[#6B7280] leading-relaxed ml-9">{r.comment}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1 ml-9">
                        {new Date(r.created_at).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
