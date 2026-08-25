import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Star, Award, Package,
  Truck, Globe, Sprout, Building2, ChevronRight,
  DollarSign, CheckCircle2, Users, Calendar,
} from "lucide-react";
import { createServerSupabase } from "@/lib/supabase-server";
import PublicNavAuthSection from "@/components/PublicNavAuthSection";
import ProfileActions from "./ProfileActions";

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.markaru.com";

/* ─── Constants ───────────────────────────────────────────── */
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  productor:    { label: "Productor",    color: "text-[#085041]",  bg: "bg-[#E1F5EE]",  Icon: Sprout    },
  exportador:   { label: "Exportador",   color: "text-blue-700",   bg: "bg-blue-100",   Icon: Globe     },
  forwarder:    { label: "Forwarder",    color: "text-orange-700", bg: "bg-orange-100", Icon: Truck     },
  certificadora:{ label: "Certificadora",color: "text-purple-700", bg: "bg-purple-100", Icon: Award     },
  banco:        { label: "Banco",        color: "text-amber-700",  bg: "bg-amber-100",  Icon: Building2 },
  comprador:    { label: "Comprador",    color: "text-pink-700",   bg: "bg-pink-100",   Icon: Package   },
};

const CATEGORY_LABELS: Record<string, string> = {
  fruta: "Fruta", verdura: "Verdura", grano: "Grano",
  procesado: "Procesado", insumo: "Insumo", ganaderia: "Ganadería", otro: "Otro",
};

const MONTH_INDEX: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

/* ─── Types ───────────────────────────────────────────────── */
interface Profile {
  user_id: string; name: string | null; business_name: string | null; role: string;
  region: string | null; country: string | null; rating: number | null;
  verified: boolean | null; operations_count: number | null;
}
interface ProducerData {
  farm_name: string | null; description: string | null; products: string[];
  certifications: string[]; harvest_months: (string | number)[]; hectares: number | null;
  annual_production_tm: number | null; province: string | null; district: string | null;
}
interface ExporterData {
  razon_social: string | null; ruc: string | null; certifications: string[]; description: string | null;
  destination_markets: string[]; incoterms: string[]; years_operating: number | null; annual_volume_tm: number | null;
}
interface ForwarderData { service_types: string[]; routes: string[]; cargo_types: string[]; }
interface CatalogProduct {
  id: string; name: string; variety: string | null; category: string;
  ref_price_fob_usd: number | null; price_unit: string; photos: string[]; available_months: (string | number)[];
}
interface ExporterCatalogProduct {
  id: string; product_name: string; variety: string | null; category: string;
  ref_price_fob_usd: number | null; price_unit: string; photos: string[];
  available_months: string[]; annual_volume_tm: number | null;
}

interface ProfileBundle {
  profile: Profile;
  producer: ProducerData | null;
  exporter: ExporterData | null;
  forwarder: ForwarderData | null;
  products: CatalogProduct[];
  exporterProducts: ExporterCatalogProduct[];
}

/* ─── Data ────────────────────────────────────────────────── */
async function getProfileData(id: string): Promise<ProfileBundle | null> {
  const supabase = createServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, name, business_name, role, region, country, rating, verified, operations_count")
    .eq("user_id", id).maybeSingle();
  if (!profile) return null;

  const role = (profile as Profile).role;
  const [pp, ep, fp, prods, expProds] = await Promise.all([
    role === "productor"
      ? supabase.from("producer_profiles").select("farm_name, description, products, certifications, harvest_months, hectares, annual_production_tm, province, district").eq("user_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    role === "exportador"
      ? supabase.from("exporter_profiles").select("razon_social, ruc, certifications, description, destination_markets, incoterms, years_operating, annual_volume_tm").eq("user_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    role === "forwarder"
      ? supabase.from("forwarder_profiles").select("service_types, routes, cargo_types").eq("user_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    role === "productor"
      ? supabase.from("products").select("id, name, variety, category, ref_price_fob_usd, price_unit, photos, available_months").eq("producer_id", id).eq("status", "active").order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    role === "exportador"
      ? supabase.from("exporter_products").select("id, product_name, variety, category, ref_price_fob_usd, price_unit, photos, available_months, annual_volume_tm").eq("exporter_id", id).eq("status", "active").order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  return {
    profile: profile as Profile,
    producer: (pp.data as ProducerData | null) ?? null,
    exporter: (ep.data as ExporterData | null) ?? null,
    forwarder: (fp.data as ForwarderData | null) ?? null,
    products: (prods.data as CatalogProduct[] | null) ?? [],
    exporterProducts: (expProds.data as ExporterCatalogProduct[] | null) ?? [],
  };
}

function nameOf(b: ProfileBundle): string {
  return b.producer?.farm_name ?? (b.exporter?.razon_social || b.profile.business_name) ?? b.profile.name ?? "Perfil";
}

/* ─── SEO ─────────────────────────────────────────────────── */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getProfileData(id);
  if (!data) return { title: "Perfil no encontrado · MARKARU" };

  const displayName = nameOf(data);
  const roleLabel = ROLE_CONFIG[data.profile.role]?.label ?? "";
  const loc = [data.profile.region, data.profile.country].filter(Boolean).join(", ");
  const description = `${displayName}${roleLabel ? ` — ${roleLabel}` : ""}${loc ? ` en ${loc}` : ""}. Conecta con ${displayName} en MARKARU, el hub agroexportador de LATAM.`;
  const url = `${SITE_URL}/perfil/${id}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: `${displayName}${roleLabel ? ` · ${roleLabel}` : ""} | MARKARU`,
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", title: displayName, description, url },
  };
}

/* ─── Presentational helpers ──────────────────────────────── */
function renderStars(rating: number) {
  return Array.from({ length: 5 }).map((_, i) => (
    <Star key={i} className={`h-4 w-4 ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} />
  ));
}
const inSeasonNum = (m: (string | number)[]) => m.map((x) => parseInt(String(x))).includes(new Date().getMonth());
const inSeasonEs  = (m: string[]) => m.map((x) => MONTH_INDEX[x.toLowerCase()]).includes(new Date().getMonth());

function MiniProductCard({ product }: { product: CatalogProduct }) {
  const inSeason = inSeasonNum(product.available_months);
  return (
    <Link href={`/producto/${product.id}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col">
      <div className="relative aspect-[4/3] bg-[#E1F5EE] overflow-hidden">
        {product.photos?.[0]
          ? <img src={product.photos[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><Package className="h-10 w-10 text-[#1D9E75]/30" /></div>}
        {inSeason && <span className="absolute top-2 left-2 bg-[#1D9E75] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Temporada</span>}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs font-bold text-[#085041] line-clamp-1 group-hover:text-[#1D9E75] transition-colors">{product.name}{product.variety ? ` · ${product.variety}` : ""}</p>
        <p className="text-[10px] text-[#6B7280] mb-2">{CATEGORY_LABELS[product.category] ?? product.category}</p>
        {product.ref_price_fob_usd != null && <p className="text-xs font-semibold text-[#085041] mt-auto">USD {product.ref_price_fob_usd}<span className="text-[#6B7280] font-normal">/{product.price_unit}</span></p>}
      </div>
    </Link>
  );
}

function MiniExporterProductCard({ product }: { product: ExporterCatalogProduct }) {
  const inSeason = inSeasonEs(product.available_months);
  return (
    <Link href={`/producto/${product.id}?tipo=exportador`} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col">
      <div className="relative aspect-[4/3] bg-blue-50 overflow-hidden">
        {product.photos?.[0]
          ? <img src={product.photos[0]} alt={product.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><Package className="h-10 w-10 text-blue-300/50" /></div>}
        {inSeason && <span className="absolute top-2 left-2 bg-[#1D9E75] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Temporada</span>}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs font-bold text-[#085041] line-clamp-1 group-hover:text-[#1D9E75] transition-colors">{product.product_name}{product.variety ? ` · ${product.variety}` : ""}</p>
        <p className="text-[10px] text-[#6B7280] mb-2">{CATEGORY_LABELS[product.category] ?? product.category}</p>
        <div className="mt-auto space-y-0.5">
          {product.ref_price_fob_usd != null && <p className="text-xs font-semibold text-[#085041]">USD {product.ref_price_fob_usd}<span className="text-[#6B7280] font-normal">/{product.price_unit}</span></p>}
          {product.annual_volume_tm != null && <p className="text-[10px] text-[#6B7280]">{product.annual_volume_tm} TM/año</p>}
        </div>
      </div>
    </Link>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div className="w-7 h-7 rounded-lg bg-[#E1F5EE] flex items-center justify-center"><Icon className="h-4 w-4 text-[#1D9E75]" /></div>
        <h2 className="text-sm font-bold text-[#085041]">{title}</h2>
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

  const { profile, producer, exporter, forwarder, products, exporterProducts } = data;
  const cfg = ROLE_CONFIG[profile.role] ?? ROLE_CONFIG["productor"];
  const { Icon } = cfg;
  const displayName = nameOf(data);
  const allCerts = [...(producer?.certifications ?? []), ...(exporter?.certifications ?? [])];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/markaru-logo.png" alt="MARKARU" className="h-8 w-auto object-contain" />
            <span className="font-bold text-sm text-gray-900 hidden sm:block">MARKARU</span>
          </Link>
          <PublicNavAuthSection />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[#6B7280] mb-5">
          <Link href="/directorio" className="flex items-center gap-1 hover:text-[#1D9E75] transition-colors"><ArrowLeft className="h-3.5 w-3.5" /> Directorio</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[#085041] font-semibold truncate">{displayName}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col items-center text-center mb-5">
                <div className={`w-20 h-20 rounded-2xl ${cfg.bg} flex items-center justify-center mb-3 shadow-sm`}>
                  <span className={`text-3xl font-extrabold ${cfg.color}`}>{displayName.charAt(0).toUpperCase()}</span>
                </div>
                <h1 className="text-lg font-extrabold text-[#085041] mb-1">{displayName}</h1>
                {profile.name && producer?.farm_name && <p className="text-xs text-[#6B7280] mb-1">{profile.name}</p>}
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                  <Icon className="h-3.5 w-3.5" /> {cfg.label}
                </span>
                {profile.verified && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-[#1D9E75] mt-2"><CheckCircle2 className="h-3.5 w-3.5" /> Verificado</div>
                )}
              </div>

              {(profile.region || profile.country) && (
                <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-3 justify-center">
                  <MapPin className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
                  {[producer?.district, producer?.province ?? profile.region, profile.country].filter(Boolean).join(", ")}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-1">
                    {profile.rating != null && profile.rating > 0 ? renderStars(profile.rating) : <span className="text-xs text-gray-400">—</span>}
                  </div>
                  <p className="text-[10px] text-[#6B7280]">{profile.rating != null && profile.rating > 0 ? Number(profile.rating).toFixed(1) : "Sin rating"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-extrabold text-[#085041]">{profile.operations_count ?? 0}</p>
                  <p className="text-[10px] text-[#6B7280]">Operaciones</p>
                </div>
              </div>

              {/* Contact + share (client) */}
              <ProfileActions profileUserId={profile.user_id} />
            </div>

            {/* Extra info card */}
            {(producer || exporter) && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-xs font-bold text-[#085041] uppercase tracking-wider mb-3">Datos de la empresa</h3>
                <div className="space-y-2 text-xs">
                  {producer?.hectares != null && <div className="flex justify-between"><span className="text-[#6B7280]">Hectáreas</span><span className="font-semibold text-[#1E293B]">{producer.hectares} ha</span></div>}
                  {producer?.annual_production_tm != null && <div className="flex justify-between"><span className="text-[#6B7280]">Producción anual</span><span className="font-semibold text-[#1E293B]">{producer.annual_production_tm} TM</span></div>}
                  {exporter?.annual_volume_tm != null && <div className="flex justify-between"><span className="text-[#6B7280]">Volumen anual</span><span className="font-semibold text-[#1E293B]">{exporter.annual_volume_tm} TM</span></div>}
                  {exporter?.years_operating != null && <div className="flex justify-between"><span className="text-[#6B7280]">Años operando</span><span className="font-semibold text-[#1E293B]">{exporter.years_operating} años</span></div>}
                  {exporter?.ruc && <div className="flex justify-between"><span className="text-[#6B7280]">RUC</span><span className="font-semibold text-[#1E293B]">{exporter.ruc}</span></div>}
                </div>
              </div>
            )}
          </div>

          {/* MAIN content */}
          <div className="lg:col-span-2 space-y-5">
            {(producer?.description ?? exporter?.description) && (
              <Section title="Sobre nosotros" icon={Building2}>
                <p className="text-sm text-[#4B5563] leading-relaxed">{producer?.description ?? exporter?.description}</p>
              </Section>
            )}

            {profile.role === "productor" && products.length > 0 && (
              <Section title="Productos en catálogo" icon={Package}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{products.map((p) => <MiniProductCard key={p.id} product={p} />)}</div>
                <Link href="/catalogo" className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-[#1D9E75] hover:underline">Ver catálogo completo <ChevronRight className="h-3.5 w-3.5" /></Link>
              </Section>
            )}

            {profile.role === "productor" && producer?.harvest_months && producer.harvest_months.length > 0 && (
              <Section title="Meses de cosecha" icon={Calendar}>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                  {MONTHS.map((label, i) => {
                    const active = producer.harvest_months.map((x) => parseInt(String(x))).includes(i);
                    const current = i === new Date().getMonth() && active;
                    return (
                      <div key={label} className={`flex flex-col items-center py-2.5 rounded-xl text-[10px] font-bold select-none ${current ? "bg-[#1D9E75] text-white ring-2 ring-[#1D9E75] ring-offset-1" : active ? "bg-[#E1F5EE] text-[#085041]" : "bg-gray-100 text-gray-300"}`}>
                        <span className="text-[8px] opacity-60 mb-0.5">{i + 1}</span>{label}
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {profile.role === "productor" && producer?.products && producer.products.length > 0 && (
              <Section title="Productos que cultiva" icon={Sprout}>
                <div className="flex flex-wrap gap-2">{producer.products.map((p) => <span key={p} className="text-xs font-semibold bg-[#E1F5EE] text-[#085041] px-3 py-1.5 rounded-full border border-[#1D9E75]/20">{p}</span>)}</div>
              </Section>
            )}

            {profile.role === "exportador" && exporterProducts.length > 0 && (
              <Section title="Productos que exporta" icon={Package}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{exporterProducts.map((p) => <MiniExporterProductCard key={p.id} product={p} />)}</div>
                <Link href="/catalogo?tipo=exportador" className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 hover:underline">Ver todos en catálogo <ChevronRight className="h-3.5 w-3.5" /></Link>
              </Section>
            )}

            {profile.role === "exportador" && exporter && (
              <>
                {exporter.destination_markets?.length > 0 && (
                  <Section title="Mercados destino" icon={Globe}>
                    <div className="flex flex-wrap gap-2">{exporter.destination_markets.map((m) => <span key={m} className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200">{m}</span>)}</div>
                  </Section>
                )}
                {exporter.incoterms?.length > 0 && (
                  <Section title="Incoterms que maneja" icon={DollarSign}>
                    <div className="flex flex-wrap gap-2">{exporter.incoterms.map((i) => <span key={i} className="text-xs font-bold bg-gray-100 text-[#1E293B] px-3 py-1.5 rounded-full">{i}</span>)}</div>
                  </Section>
                )}
              </>
            )}

            {profile.role === "forwarder" && forwarder && (
              <>
                {forwarder.service_types?.length > 0 && (
                  <Section title="Servicios" icon={Truck}>
                    <div className="flex flex-wrap gap-2">{forwarder.service_types.map((s) => <span key={s} className="text-xs font-semibold bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full border border-orange-200">{s}</span>)}</div>
                  </Section>
                )}
                {forwarder.routes?.length > 0 && (
                  <Section title="Rutas que opera" icon={Globe}>
                    <div className="flex flex-wrap gap-2">{forwarder.routes.map((r) => <span key={r} className="text-xs font-semibold bg-gray-100 text-[#1E293B] px-3 py-1.5 rounded-full">{r}</span>)}</div>
                  </Section>
                )}
                {forwarder.cargo_types?.length > 0 && (
                  <Section title="Tipos de carga" icon={Package}>
                    <div className="flex flex-wrap gap-2">{forwarder.cargo_types.map((c) => <span key={c} className="text-xs font-bold bg-gray-100 text-[#1E293B] px-3 py-1.5 rounded-full">{c.replace("_", " ")}</span>)}</div>
                  </Section>
                )}
              </>
            )}

            {allCerts.length > 0 && (
              <Section title="Certificaciones" icon={Award}>
                <div className="flex flex-wrap gap-2">{allCerts.map((c) => <span key={c} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#E1F5EE] text-[#085041] border border-[#1D9E75]/20 px-3 py-1.5 rounded-full"><Award className="h-3 w-3" /> {c}</span>)}</div>
              </Section>
            )}

            {!producer && !exporter && !forwarder && products.length === 0 && exporterProducts.length === 0 && allCerts.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-16 text-center">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#085041] mb-1">Perfil en construcción</p>
                <p className="text-xs text-[#6B7280]">Este usuario aún no ha completado su perfil.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
