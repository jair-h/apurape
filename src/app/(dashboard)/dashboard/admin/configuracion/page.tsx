"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { Save, Loader2, Settings, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ImageUpload } from "@/components/admin/ImageUpload";

/* ─── Types ───────────────────────────────────────────────── */
interface LandingStats {
  exporters: number; products: number; countries: number; transactions: number;
}

interface HeroContent {
  title1: string; title2: string; subtitle: string;
  ctaProducer: string; ctaExporter: string; bg_image_url: string;
}

interface SectionContent {
  title: string; subtitle: string; body: string;
  image_url: string; cta_text: string; cta_link: string; active: boolean;
}

interface LandingSections {
  products: SectionContent;
  producerStory: SectionContent;
  export: SectionContent;
}

interface ConfigState {
  contact_email: string;
  currencies: string[];
  landing_stats: LandingStats;
  hero_content: HeroContent;
  landing_sections: LandingSections;
}

/* ─── Defaults ────────────────────────────────────────────── */
const DEFAULT_HERO: HeroContent = {
  title1: "", title2: "", subtitle: "", ctaProducer: "", ctaExporter: "", bg_image_url: "",
};

const DEFAULT_SECTION: SectionContent = {
  title: "", subtitle: "", body: "", image_url: "", cta_text: "", cta_link: "", active: true,
};

const DEFAULT: ConfigState = {
  contact_email: "",
  currencies: ["USD", "EUR", "PEN"],
  landing_stats: { exporters: 0, products: 0, countries: 0, transactions: 0 },
  hero_content: { ...DEFAULT_HERO },
  landing_sections: {
    products:      { ...DEFAULT_SECTION },
    producerStory: { ...DEFAULT_SECTION },
    export:        { ...DEFAULT_SECTION },
  },
};

function parseConfig(rows: { key: string; value: unknown }[]): ConfigState {
  const out = { ...DEFAULT, hero_content: { ...DEFAULT_HERO }, landing_sections: { products: { ...DEFAULT_SECTION }, producerStory: { ...DEFAULT_SECTION }, export: { ...DEFAULT_SECTION } } };
  for (const r of rows) {
    if (r.key === "contact_email")   out.contact_email   = String(r.value);
    if (r.key === "currencies")      out.currencies      = r.value as string[];
    if (r.key === "landing_stats")   out.landing_stats   = r.value as LandingStats;
    if (r.key === "hero_content")    out.hero_content    = { ...DEFAULT_HERO,    ...(r.value as HeroContent) };
    if (r.key === "landing_sections") {
      const v = r.value as Partial<LandingSections>;
      out.landing_sections = {
        products:      { ...DEFAULT_SECTION, ...(v?.products) },
        producerStory: { ...DEFAULT_SECTION, ...(v?.producerStory) },
        export:        { ...DEFAULT_SECTION, ...(v?.export) },
      };
    }
  }
  return out;
}

/* ─── Page ────────────────────────────────────────────────── */
export default function AdminConfigPage() {
  const [cfg, setCfg]         = useState<ConfigState>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [newCurrency, setNewCurrency] = useState("");

  const inputCls  = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition";
  const labelCls  = "block text-xs font-semibold text-gray-700 mb-1.5";
  const sectionHd = "flex items-center gap-2 pb-3 border-b border-gray-100 mb-4";

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("config").select("key, value");
    setCfg(parseConfig(data ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const upsert = async (key: string, value: unknown) => {
    const supabase = createClient();
    await supabase.from("config").upsert({ key, value }, { onConflict: "key" });
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      upsert("contact_email",    cfg.contact_email),
      upsert("currencies",       cfg.currencies),
      upsert("landing_stats",    cfg.landing_stats),
      upsert("hero_content",     cfg.hero_content),
      upsert("landing_sections", cfg.landing_sections),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  /* helpers */
  const setStat    = (k: keyof LandingStats, v: number) =>
    setCfg((p) => ({ ...p, landing_stats: { ...p.landing_stats, [k]: v } }));

  const setHero    = (k: keyof HeroContent, v: string) =>
    setCfg((p) => ({ ...p, hero_content: { ...p.hero_content, [k]: v } }));

  const setSection = (sec: keyof LandingSections, k: keyof SectionContent, v: string | boolean) =>
    setCfg((p) => ({
      ...p,
      landing_sections: {
        ...p.landing_sections,
        [sec]: { ...p.landing_sections[sec], [k]: v },
      },
    }));

  const addCurrency = () => {
    const c = newCurrency.trim().toUpperCase();
    if (!c || cfg.currencies.includes(c)) { setNewCurrency(""); return; }
    setCfg((p) => ({ ...p, currencies: [...p.currencies, c] }));
    setNewCurrency("");
  };

  const removeCurrency = (c: string) =>
    setCfg((p) => ({ ...p, currencies: p.currencies.filter((x) => x !== c) }));

  if (loading) return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
    </div>
  );

  /* reusable section card shell */
  const Card = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
      <div className={sectionHd}>
        <Settings className="h-4 w-4 text-[#1D9E75]" />
        <h2 className="text-sm font-extrabold text-[#085041]">{title}</h2>
      </div>
      {children}
    </div>
  );

  /* reusable active toggle */
  const ActiveToggle = ({ sec }: { sec: keyof LandingSections }) => (
    <div className="flex items-center gap-2 pt-1">
      <button type="button" onClick={() => setSection(sec, "active", !cfg.landing_sections[sec].active)}>
        {cfg.landing_sections[sec].active
          ? <ToggleRight className="h-7 w-7 text-[#1D9E75]" />
          : <ToggleLeft  className="h-7 w-7 text-gray-300" />}
      </button>
      <span className="text-xs font-semibold text-gray-600">
        {cfg.landing_sections[sec].active ? "Sección visible" : "Sección oculta"}
      </span>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Configuración</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Ajustes globales y contenido editable de la landing.</p>
        </div>
        <button type="button" onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D9E75] text-white text-sm font-bold hover:bg-[#085041] disabled:opacity-50 transition-colors shadow-sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
        </button>
      </div>

      {/* ── Hero de la landing ── */}
      <Card title="Hero de la landing">
        <p className="text-xs text-[#6B7280]">
          Los campos vacíos usan los textos por defecto del sitio. Solo rellena lo que quieras cambiar.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Título línea 1</label>
            <input value={cfg.hero_content.title1}
              onChange={(e) => setHero("title1", e.target.value)}
              placeholder="Exporta tus productos" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Título línea 2 (texto verde claro)</label>
            <input value={cfg.hero_content.title2}
              onChange={(e) => setHero("title2", e.target.value)}
              placeholder="al mundo desde LATAM" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Subtítulo / descripción</label>
          <textarea value={cfg.hero_content.subtitle} rows={2}
            onChange={(e) => setHero("subtitle", e.target.value)}
            placeholder="Conectamos productores agrícolas..." className={`${inputCls} resize-none`} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Texto botón principal</label>
            <input value={cfg.hero_content.ctaProducer}
              onChange={(e) => setHero("ctaProducer", e.target.value)}
              placeholder="Soy Productor" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Texto botón secundario</label>
            <input value={cfg.hero_content.ctaExporter}
              onChange={(e) => setHero("ctaExporter", e.target.value)}
              placeholder="Soy Exportador" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Imagen de fondo del hero (opcional)</label>
          <ImageUpload
            value={cfg.hero_content.bg_image_url}
            onChange={(url) => setHero("bg_image_url", url)}
            inputClassName={inputCls}
          />
          {cfg.hero_content.bg_image_url && (
            <div className="mt-2 relative rounded-xl overflow-hidden h-28 bg-gray-100">
              <img src={cfg.hero_content.bg_image_url} alt=""
                className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-[#085041]/60 flex items-center justify-center">
                <p className="text-white text-xs font-bold">Preview con overlay verde</p>
              </div>
            </div>
          )}
          <p className="text-xs text-[#6B7280] mt-1.5">
            Si hay imagen, se muestra con overlay verde semitransparente para que el texto sea legible.
            Si está vacío, se usa el fondo verde degradado por defecto.
          </p>
        </div>
      </Card>

      {/* ── Sección A — Productos del agro ── */}
      <Card title="Sección — Productos del agro peruano">
        <ActiveToggle sec="products" />
        <div>
          <label className={labelCls}>Título</label>
          <input value={cfg.landing_sections.products.title}
            onChange={(e) => setSection("products", "title", e.target.value)}
            placeholder="Productos del agro peruano con demanda mundial" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Subtítulo</label>
          <input value={cfg.landing_sections.products.subtitle}
            onChange={(e) => setSection("products", "subtitle", e.target.value)}
            placeholder="Conectamos lo mejor de nuestra tierra..." className={inputCls} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Texto del botón</label>
            <input value={cfg.landing_sections.products.cta_text}
              onChange={(e) => setSection("products", "cta_text", e.target.value)}
              placeholder="Ver catálogo completo" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Link del botón</label>
            <input value={cfg.landing_sections.products.cta_link}
              onChange={(e) => setSection("products", "cta_link", e.target.value)}
              placeholder="/servicios" className={inputCls} />
          </div>
        </div>
      </Card>

      {/* ── Sección B — Del productor al mundo ── */}
      <Card title="Sección — Del productor al mundo">
        <ActiveToggle sec="producerStory" />
        <div>
          <label className={labelCls}>Título</label>
          <input value={cfg.landing_sections.producerStory.title}
            onChange={(e) => setSection("producerStory", "title", e.target.value)}
            placeholder="Los productores merecen llegar directo al mundo" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Párrafo / descripción</label>
          <textarea value={cfg.landing_sections.producerStory.body} rows={3}
            onChange={(e) => setSection("producerStory", "body", e.target.value)}
            placeholder="Durante años, los productores agrícolas de LATAM..."
            className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={labelCls}>Imagen (agricultor en el campo)</label>
          <ImageUpload
            value={cfg.landing_sections.producerStory.image_url}
            onChange={(url) => setSection("producerStory", "image_url", url)}
            inputClassName={inputCls}
          />
          {cfg.landing_sections.producerStory.image_url && (
            <img src={cfg.landing_sections.producerStory.image_url} alt=""
              className="mt-2 w-full aspect-[4/3] object-cover rounded-xl" />
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Texto del botón</label>
            <input value={cfg.landing_sections.producerStory.cta_text}
              onChange={(e) => setSection("producerStory", "cta_text", e.target.value)}
              placeholder="Únete como productor" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Link del botón</label>
            <input value={cfg.landing_sections.producerStory.cta_link}
              onChange={(e) => setSection("producerStory", "cta_link", e.target.value)}
              placeholder="/register?rol=proveedor" className={inputCls} />
          </div>
        </div>
      </Card>

      {/* ── Sección C — Exportación completa ── */}
      <Card title="Sección — De la cosecha al contenedor">
        <ActiveToggle sec="export" />
        <div>
          <label className={labelCls}>Título</label>
          <input value={cfg.landing_sections.export.title}
            onChange={(e) => setSection("export", "title", e.target.value)}
            placeholder="De la cosecha al contenedor, todo en MARKARU" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Párrafo / descripción</label>
          <textarea value={cfg.landing_sections.export.body} rows={3}
            onChange={(e) => setSection("export", "body", e.target.value)}
            placeholder="Conecta con agentes de carga verificados..."
            className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={labelCls}>Imagen (puerto / contenedores)</label>
          <ImageUpload
            value={cfg.landing_sections.export.image_url}
            onChange={(url) => setSection("export", "image_url", url)}
            inputClassName={inputCls}
          />
          {cfg.landing_sections.export.image_url && (
            <img src={cfg.landing_sections.export.image_url} alt=""
              className="mt-2 w-full aspect-[4/3] object-cover rounded-xl" />
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Texto del botón</label>
            <input value={cfg.landing_sections.export.cta_text}
              onChange={(e) => setSection("export", "cta_text", e.target.value)}
              placeholder="Ver cómo funciona" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Link del botón</label>
            <input value={cfg.landing_sections.export.cta_link}
              onChange={(e) => setSection("export", "cta_link", e.target.value)}
              placeholder="/#como-funciona" className={inputCls} />
          </div>
        </div>
      </Card>

      {/* ── Email de contacto ── */}
      <Card title="Email de contacto">
        <div>
          <label className={labelCls}>Email público de contacto</label>
          <input type="email" value={cfg.contact_email}
            onChange={(e) => setCfg((p) => ({ ...p, contact_email: e.target.value }))}
            placeholder="contacto@markaru.com" className={inputCls} />
          <p className="text-xs text-[#6B7280] mt-1.5">Este email aparece en la página de Contacto.</p>
        </div>
      </Card>

      {/* ── Estadísticas de la landing ── */}
      <Card title="Estadísticas de la landing">
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              { k: "exporters",    label: "Exportadores" },
              { k: "products",     label: "Productos" },
              { k: "countries",    label: "Países" },
              { k: "transactions", label: "Transacciones" },
            ] as { k: keyof LandingStats; label: string }[]
          ).map(({ k, label }) => (
            <div key={k}>
              <label className={labelCls}>{label}</label>
              <input type="number" min={0} value={cfg.landing_stats[k]}
                onChange={(e) => setStat(k, Number(e.target.value))} className={inputCls} />
            </div>
          ))}
        </div>
        <p className="text-xs text-[#6B7280]">Números que se muestran en la sección hero de la landing.</p>
      </Card>

      {/* ── Divisas activas ── */}
      <Card title="Divisas activas">
        <div className="flex flex-wrap gap-2">
          {cfg.currencies.map((c) => (
            <div key={c} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#E1F5EE] text-xs font-bold text-[#085041]">
              {c}
              <button type="button" onClick={() => removeCurrency(c)}
                className="ml-1 text-[#085041] hover:text-red-500">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newCurrency} onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && addCurrency()}
            maxLength={3} placeholder="Ej: CLP" className={`flex-1 ${inputCls}`} />
          <button type="button" onClick={addCurrency}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors">
            <Plus className="h-3.5 w-3.5" /> Añadir
          </button>
        </div>
        <p className="text-xs text-[#6B7280]">Divisas disponibles en el selector de moneda del sitio.</p>
      </Card>

    </div>
  );
}
