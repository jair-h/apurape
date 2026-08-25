"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Loader2,
  X, ChevronLeft, FileText, Globe, Clock, Search, Calendar,
  Copy, CloudCheck, Cloud, LayoutTemplate, Share2,
  MessageCircleQuestion, Megaphone, Wrench, ListChecks, ChevronUp, ChevronDown, AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { CTA_PRESETS, CTA_ORDER, BLOG_TOOLS, type Faq } from "@/lib/blog";

/* ─── Types ───────────────────────────────────────────────── */
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  category: string | null;
  tags: string[];
  status: "draft" | "published";
  author: string;
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  secondary_keywords: string[];
  faqs: Faq[];
  cta_type: string | null;
  cta_link: string | null;
  related_ids: string[];
  tools: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const EMPTY_POST: Omit<BlogPost, "id" | "created_at" | "updated_at"> = {
  title: "", slug: "", summary: "", content: "",
  image_url: "", category: "", tags: [], status: "draft",
  author: "Markaru Insights",
  meta_title: "", meta_description: "", focus_keyword: "", secondary_keywords: [],
  faqs: [], cta_type: "", cta_link: "", related_ids: [], tools: [],
  published_at: null,
};

const CATEGORIES = ["productos", "logistica", "mercados", "exportacion", "certificaciones", "financiamiento", "normativa", "tecnologia"];
const CAT_LABELS: Record<string, string> = {
  productos: "Productos", logistica: "Logística", mercados: "Mercados",
  exportacion: "Exportación", certificaciones: "Certificaciones",
  financiamiento: "Financiamiento", normativa: "Normativa", tecnologia: "Tecnología & IA",
};

/* ─── Article templates (H2 outlines) ─────────────────────── */
const TEMPLATES: { key: string; label: string; category: string; headings: string[] }[] = [
  { key: "producto", label: "Producto", category: "productos", headings: [
    "Introducción", "¿Por qué exportar este producto?", "Principales mercados internacionales",
    "Requisitos para exportar", "Certificaciones recomendadas", "Logística y transporte",
    "Precio FOB y costos", "Cómo encontrar compradores", "Errores comunes", "Preguntas frecuentes", "Conclusión",
  ] },
  { key: "logistica", label: "Logística", category: "logistica", headings: [
    "Introducción", "¿Qué significa este concepto?", "¿Por qué es importante en comercio internacional?",
    "Cómo funciona paso a paso", "Ejemplo práctico", "Errores comunes", "Preguntas frecuentes", "Conclusión",
  ] },
  { key: "exportacion", label: "Exportación", category: "exportacion", headings: [
    "Introducción", "¿Qué es y por qué importa?", "Marco general del proceso de exportación",
    "Documentación necesaria", "Incoterms y responsabilidades", "Logística y transporte internacional",
    "Costos y formas de pago", "Errores comunes", "Preguntas frecuentes", "Conclusión",
  ] },
  { key: "certificacion", label: "Certificación", category: "certificaciones", headings: [
    "Introducción", "¿Qué es esta certificación?", "¿Por qué es importante para exportar?",
    "Requisitos y alcance", "Proceso de certificación paso a paso", "Costos y tiempos estimados",
    "Errores comunes", "Preguntas frecuentes", "Conclusión",
  ] },
  { key: "mercado", label: "Mercado", category: "mercados", headings: [
    "Introducción", "Panorama general del mercado", "Demanda y tendencias de consumo",
    "Requisitos de acceso y aranceles", "Competencia y precios de referencia",
    "Oportunidades para exportadores de LATAM", "Riesgos y consideraciones", "Preguntas frecuentes", "Conclusión",
  ] },
  { key: "financiamiento", label: "Financiamiento", category: "financiamiento", headings: [
    "Introducción", "¿En qué consiste?", "¿Por qué es clave para exportar?",
    "Tipos de financiamiento disponibles", "Requisitos y cómo aplicar", "Costos, tasas y plazos",
    "Errores comunes", "Preguntas frecuentes", "Conclusión",
  ] },
  { key: "normativa", label: "Normativa", category: "normativa", headings: [
    "Introducción", "¿Qué regula esta normativa?", "¿A quién aplica?", "Principales obligaciones",
    "Cómo cumplir paso a paso", "Sanciones por incumplimiento", "Errores comunes", "Preguntas frecuentes", "Conclusión",
  ] },
  { key: "tecnologia", label: "Tecnología", category: "tecnologia", headings: [
    "Introducción", "¿Qué es y cómo funciona?", "Aplicaciones en la agroexportación", "Beneficios concretos",
    "Casos de uso reales", "Cómo implementarlo", "Retos y limitaciones", "Preguntas frecuentes", "Conclusión",
  ] },
];

const templateHtml = (headings: string[]) =>
  headings.map((h) => `<h2>${h}</h2><p></p>`).join("");

function slugify(text: string) {
  return text.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-");
}

/* Word count + reading time from HTML (words / 200) */
function contentStats(html: string) {
  const text = (html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return { words, mins: Math.max(1, Math.round(words / 200)) };
}

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }) : "—";

const relTime = (ts: number) => {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "hace un momento";
  if (s < 60) return `hace ${s} segundos`;
  const m = Math.round(s / 60);
  return `hace ${m} min`;
};

/* ─── Preview modal ───────────────────────────────────────── */
function PreviewModal({ post, onClose }: { post: Partial<BlogPost>; onClose: () => void }) {
  const { words, mins } = contentStats(post.content ?? "");
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vista previa</span>
          <button type="button" onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="p-6 sm:p-8">
          {post.image_url && (
            <img src={post.image_url} alt={post.title} className="w-full aspect-video object-cover rounded-2xl mb-6" />
          )}
          {post.category && (
            <span className="inline-block bg-[#E1F5EE] text-[#085041] text-xs font-bold px-2.5 py-1 rounded-full mb-3">
              {CAT_LABELS[post.category] ?? post.category}
            </span>
          )}
          <h1 className="text-3xl font-extrabold text-[#1E293B] mb-3 leading-tight">{post.title || "Sin título"}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-6">
            <span>{post.author || "Markaru Insights"}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {words.toLocaleString("es")} palabras · {mins} min de lectura</span>
          </div>
          {post.summary && (
            <p className="text-lg text-gray-500 mb-6 border-l-4 border-[#1D9E75] pl-4 leading-relaxed">{post.summary}</p>
          )}
          <div className="rich-content" dangerouslySetInnerHTML={{ __html: post.content || "<p style='color:#9ca3af'>Sin contenido…</p>" }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Template picker (on new article) ────────────────────── */
function TemplatePicker({ onPick, onClose }: { onPick: (tpl: typeof TEMPLATES[number] | null) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-[#085041]"><LayoutTemplate className="h-4 w-4" /> Elige una plantilla</h3>
          <button type="button" onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="px-5 py-4">
          <button type="button" onClick={() => onPick(null)}
            className="w-full mb-3 flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-all">
            <FileText className="h-4 w-4" /> Documento en blanco
          </button>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((tpl) => (
              <button key={tpl.key} type="button" onClick={() => onPick(tpl)}
                className="text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-[#1D9E75] hover:bg-[#E1F5EE] transition-all">
                <p className="text-sm font-bold text-[#085041]">{tpl.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{tpl.headings.length} secciones</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Social share preview ────────────────────────────────── */
function SocialPreview({ post }: { post: Partial<BlogPost> }) {
  const [origin, setOrigin] = useState("https://markaru.com");
  useEffect(() => { if (typeof window !== "undefined") setOrigin(window.location.origin); }, []);

  const title = post.meta_title || post.title || "Título del artículo";
  const desc  = post.meta_description || post.summary || "Descripción del artículo para buscadores y redes sociales.";
  const url   = `${origin}/blog/${post.slug || "articulo"}`;
  const host  = origin.replace(/^https?:\/\//, "");
  const img   = post.image_url;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-5">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#085041]"><Share2 className="h-4 w-4" /> Vista previa social</h3>

      {/* Google */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Google</p>
        <div className="border border-gray-100 rounded-xl p-3">
          <p className="text-xs text-gray-600 truncate">{host} › blog › {post.slug || "articulo"}</p>
          <p className="text-[#1a0dab] text-base leading-snug truncate">{title}</p>
          <p className="text-xs text-gray-600 line-clamp-2">{desc}</p>
        </div>
      </div>

      {/* LinkedIn / Facebook */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">LinkedIn / Facebook</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="aspect-video bg-gray-100">
            {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Sin imagen</div>}
          </div>
          <div className="bg-gray-50 px-3 py-2">
            <p className="text-[10px] text-gray-500 uppercase truncate">{host}</p>
            <p className="text-sm font-bold text-gray-800 line-clamp-1">{title}</p>
            <p className="text-xs text-gray-500 line-clamp-1">{desc}</p>
          </div>
        </div>
      </div>

      {/* WhatsApp */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">WhatsApp</p>
        <div className="bg-[#dcf8c6] rounded-xl p-2 max-w-[280px]">
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            {img && <img src={img} alt="" className="w-full h-24 object-cover" />}
            <div className="px-2.5 py-2">
              <p className="text-xs font-bold text-gray-800 line-clamp-2">{title}</p>
              <p className="text-[11px] text-gray-500 line-clamp-2">{desc}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">{host}</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-600 mt-1 px-1 truncate">{url}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Editor ──────────────────────────────────────────────── */
function PostEditor({
  post, allPosts, onSave, onAutoSave, onDelete, onBack, saving, deleting,
}: {
  post: Partial<BlogPost> & { title: string; slug: string; status: "draft" | "published" };
  allPosts: BlogPost[];
  onSave: (data: Partial<BlogPost>, publish: boolean) => Promise<{ error: string | null }>;
  onAutoSave: (data: Partial<BlogPost>) => Promise<{ id: string | null; error: string | null }>;
  onDelete?: () => void;
  onBack: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  const [form, setForm] = useState({
    ...EMPTY_POST, ...post,
    tags: post.tags ?? [], secondary_keywords: post.secondary_keywords ?? [],
    faqs: post.faqs ?? [], related_ids: post.related_ids ?? [], tools: post.tools ?? [],
  });
  const [tagsInput, setTagsInput] = useState((post.tags ?? []).join(", "));
  const [secKwInput, setSecKwInput] = useState((post.secondary_keywords ?? []).join(", "));
  const [preview, setPreview] = useState(false);

  const [savedId, setSavedId]     = useState<string | null>(post.id ?? null);
  const [dirty, setDirty]         = useState(false);
  const [autoState, setAutoState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [saveErr, setSaveErr]     = useState<string | null>(null);
  const [, tick]                  = useState(0);
  const busyRef = useRef(false);

  const set = (field: string, value: unknown) => { setForm((f) => ({ ...f, [field]: value })); setDirty(true); };

  /* FAQ helpers */
  const faqs: Faq[] = form.faqs ?? [];
  const setFaqs = (next: Faq[]) => set("faqs", next);
  const addFaq = () => setFaqs([...faqs, { question: "", answer: "" }]);
  const updateFaq = (i: number, field: keyof Faq, v: string) => setFaqs(faqs.map((f, idx) => idx === i ? { ...f, [field]: v } : f));
  const removeFaq = (i: number) => setFaqs(faqs.filter((_, idx) => idx !== i));
  const moveFaq = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= faqs.length) return;
    const next = [...faqs];
    [next[i], next[j]] = [next[j], next[i]];
    setFaqs(next);
  };

  /* Tools + related helpers */
  const toggleTool = (key: string) => {
    const cur = form.tools ?? [];
    set("tools", cur.includes(key) ? cur.filter((t) => t !== key) : [...cur, key]);
  };
  const toggleRelated = (id: string) => {
    const cur = form.related_ids ?? [];
    if (cur.includes(id)) set("related_ids", cur.filter((r) => r !== id));
    else if (cur.length < 3) set("related_ids", [...cur, id]);
  };

  const handleTitleChange = (v: string) => {
    set("title", v);
    if (!post.id && !savedId) set("slug", slugify(v));
  };

  const buildPayload = (): Partial<BlogPost> => ({
    ...form,
    id: savedId ?? undefined,
    // slug always non-empty (auto from title if blank)
    slug: form.slug && form.slug.trim() ? form.slug.trim() : slugify(form.title),
    // empty category must be null (a CHECK constraint rejects "")
    category: form.category ? form.category : null,
    tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
    secondary_keywords: secKwInput.split(",").map((t) => t.trim()).filter(Boolean),
  });

  const handleSubmit = async (publish: boolean) => {
    setSaveErr(null);
    const { error } = await onSave(buildPayload(), publish);
    if (error) setSaveErr(error);
  };

  /* Auto-save every 30s when there are pending changes */
  const doAutoSave = async () => {
    if (busyRef.current || !form.title.trim() || !dirty) return;
    busyRef.current = true;
    setAutoState("saving");
    setDirty(false); // optimistic — edits during await re-mark dirty
    try {
      const { id, error } = await onAutoSave(buildPayload());
      if (error) { setAutoState("error"); setSaveErr(error); setDirty(true); return; }
      if (id && !savedId) setSavedId(id);
      setLastSaved(Date.now());
      setAutoState("saved");
    } catch (e) {
      setAutoState("error");
      setSaveErr(e instanceof Error ? e.message : "Error al autoguardar");
      setDirty(true);
    } finally {
      busyRef.current = false;
    }
  };
  const autoRef = useRef(doAutoSave);
  autoRef.current = doAutoSave;

  useEffect(() => {
    const t = setInterval(() => autoRef.current(), 30000);
    const clock = setInterval(() => tick((n) => n + 1), 5000); // refresh "hace X"
    return () => { clearInterval(t); clearInterval(clock); };
  }, []);

  const { words, mins } = useMemo(() => contentStats(form.content ?? ""), [form.content]);

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition";
  const labelCls = "block text-xs font-semibold text-gray-700 mb-1.5";

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <button type="button" onClick={onBack}
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-all bg-white">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold text-[#085041]">
            {post.id ? "Editar artículo" : "Nuevo artículo"}
          </h1>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            form.status === "published" ? "bg-[#E1F5EE] text-[#085041]" : "bg-gray-100 text-gray-500"
          }`}>
            {form.status === "published" ? "Publicado" : "Borrador"}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setPreview(true)} disabled={!form.title}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:border-[#1D9E75] hover:text-[#1D9E75] bg-white disabled:opacity-50 transition-all">
            <Eye className="h-3.5 w-3.5" /> Vista previa
          </button>
          <button type="button" onClick={() => handleSubmit(false)}
            disabled={saving || !form.title}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:border-[#1D9E75] hover:text-[#1D9E75] bg-white disabled:opacity-50 transition-all">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Guardar borrador
          </button>
          <button type="button" onClick={() => handleSubmit(true)}
            disabled={saving || !form.title}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1D9E75] text-white text-xs font-bold hover:bg-[#085041] disabled:opacity-50 transition-all">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
            Publicar
          </button>
        </div>
      </div>

      {/* Auto-save status */}
      <div className="mb-3 pl-1">
        {autoState === "saving" ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500"><Loader2 className="h-3 w-3 animate-spin" /> Guardando automáticamente…</span>
        ) : autoState === "error" ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" /> Error al autoguardar</span>
        ) : dirty ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600"><Cloud className="h-3.5 w-3.5" /> Cambios pendientes</span>
        ) : lastSaved ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-[#1D9E75]"><CloudCheck className="h-3.5 w-3.5" /> Guardado automáticamente {relTime(lastSaved)}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400"><Cloud className="h-3.5 w-3.5" /> El autoguardado se activa al escribir</span>
        )}
      </div>

      {/* Save error banner */}
      {saveErr && (
        <div className="mb-6 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1"><strong>No se pudo guardar.</strong> {saveErr}</span>
          <button type="button" onClick={() => setSaveErr(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
            <div>
              <label className={labelCls}>Título *</label>
              <input value={form.title} onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Título del artículo" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Slug (URL) — se genera del título, editable</label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-l-xl text-xs text-gray-400 border-r-0">/blog/</span>
                <input value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))}
                  placeholder="mi-articulo" className={`${inputCls} rounded-l-none`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Resumen (extracto · máx. 200 caracteres)</label>
              <textarea value={form.summary ?? ""} onChange={(e) => set("summary", e.target.value)}
                rows={2} maxLength={200} placeholder="Descripción breve que aparece en las tarjetas del blog..."
                className={inputCls} />
              <p className="text-[10px] text-gray-400 mt-1 text-right">{(form.summary ?? "").length}/200</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Contenido</label>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1D9E75]">
                  <Clock className="h-3 w-3" /> {words.toLocaleString("es")} palabras · {mins} min de lectura
                </span>
              </div>
              <RichTextEditor value={form.content ?? ""} onChange={(html) => set("content", html)} folder="blog" />
            </div>
          </div>

          {/* FAQ editor */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#085041]"><MessageCircleQuestion className="h-4 w-4" /> Preguntas frecuentes (FAQ)</h3>
              <button type="button" onClick={addFaq}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E1F5EE] text-[#085041] text-xs font-bold hover:bg-[#1D9E75] hover:text-white transition-all">
                <Plus className="h-3.5 w-3.5" /> Añadir pregunta
              </button>
            </div>
            {faqs.length === 0 ? (
              <p className="text-xs text-gray-400">Sin preguntas. Añade FAQs para generar el FAQ Schema y mejorar el SEO.</p>
            ) : (
              <div className="space-y-3">
                {faqs.map((f, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400">#{i + 1}</span>
                      <input value={f.question} onChange={(e) => updateFaq(i, "question", e.target.value)}
                        placeholder="Pregunta" className={`${inputCls} flex-1`} />
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button type="button" onClick={() => moveFaq(i, -1)} disabled={i === 0} title="Subir"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                        <button type="button" onClick={() => moveFaq(i, 1)} disabled={i === faqs.length - 1} title="Bajar"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                        <button type="button" onClick={() => removeFaq(i)} title="Eliminar"
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <textarea value={f.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)}
                      rows={2} placeholder="Respuesta" className={inputCls} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Featured image */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#085041]">Imagen destacada</h3>
            <div>
              <label className={labelCls}>URL de la imagen</label>
              <ImageUpload value={form.image_url ?? ""} onChange={(url) => set("image_url", url)} inputClassName={inputCls} folder="blog" />
            </div>
            {form.image_url && (
              <img src={form.image_url} alt="preview" className="w-full aspect-video object-cover rounded-xl border border-gray-100" />
            )}
          </div>

          {/* Author */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#085041]">Autor</h3>
            <input value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="Markaru Insights" className={inputCls} />
          </div>

          {/* Category & tags */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#085041]">Categoría y tags</h3>
            <div>
              <label className={labelCls}>Categoría</label>
              <select value={form.category ?? ""} onChange={(e) => set("category", e.target.value || null)} className={inputCls}>
                <option value="">Sin categoría</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tags (separados por coma)</label>
              <input value={tagsInput} onChange={(e) => { setTagsInput(e.target.value); setDirty(true); }}
                placeholder="agro, exportacion, latam" className={inputCls} />
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#085041]"><Search className="h-4 w-4" /> SEO</h3>
            <div>
              <label className={labelCls}>Meta Title <span className="text-gray-400 font-normal">(si vacío usa el título)</span></label>
              <input value={form.meta_title ?? ""} onChange={(e) => set("meta_title", e.target.value)}
                maxLength={70} placeholder="Título para Google (≤ 60 car.)" className={inputCls} />
              <p className="text-[10px] text-gray-400 mt-1 text-right">{(form.meta_title ?? "").length}/70</p>
            </div>
            <div>
              <label className={labelCls}>Meta Description <span className="text-gray-400 font-normal">(si vacío usa el resumen)</span></label>
              <textarea value={form.meta_description ?? ""} onChange={(e) => set("meta_description", e.target.value)}
                rows={3} maxLength={165} placeholder="Descripción para Google (≤ 155 car.)" className={inputCls} />
              <p className="text-[10px] text-gray-400 mt-1 text-right">{(form.meta_description ?? "").length}/165</p>
            </div>
            <div>
              <label className={labelCls}>Palabra clave principal</label>
              <input value={form.focus_keyword ?? ""} onChange={(e) => set("focus_keyword", e.target.value)}
                placeholder="exportar palta a europa" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Palabras clave secundarias (separadas por coma)</label>
              <input value={secKwInput} onChange={(e) => { setSecKwInput(e.target.value); setDirty(true); }}
                placeholder="certificación gap, flete marítimo" className={inputCls} />
            </div>
          </div>

          {/* Social preview */}
          <SocialPreview post={form} />

          {/* CTA */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#085041]"><Megaphone className="h-4 w-4" /> CTA al final del artículo</h3>
            <div>
              <label className={labelCls}>Tipo de CTA</label>
              <select value={form.cta_type ?? ""} onChange={(e) => set("cta_type", e.target.value || null)} className={inputCls}>
                <option value="">Sin CTA</option>
                {CTA_ORDER.map((k) => <option key={k} value={k}>{CTA_PRESETS[k].label}</option>)}
              </select>
            </div>
            {form.cta_type && CTA_PRESETS[form.cta_type as keyof typeof CTA_PRESETS] && (
              <>
                <div className="rounded-xl bg-[#085041] p-4 text-center">
                  <p className="text-sm font-extrabold text-white">{CTA_PRESETS[form.cta_type as keyof typeof CTA_PRESETS].title}</p>
                  <p className="text-[11px] text-white/80 mt-1">{CTA_PRESETS[form.cta_type as keyof typeof CTA_PRESETS].description}</p>
                  <span className="inline-block mt-2 bg-white text-[#085041] text-[11px] font-bold px-3 py-1.5 rounded-lg">
                    {CTA_PRESETS[form.cta_type as keyof typeof CTA_PRESETS].button}
                  </span>
                </div>
                <div>
                  <label className={labelCls}>Enlace del botón <span className="text-gray-400 font-normal">(opcional, por defecto {CTA_PRESETS[form.cta_type as keyof typeof CTA_PRESETS].link})</span></label>
                  <input value={form.cta_link ?? ""} onChange={(e) => set("cta_link", e.target.value)}
                    placeholder={CTA_PRESETS[form.cta_type as keyof typeof CTA_PRESETS].link} className={inputCls} />
                </div>
              </>
            )}
          </div>

          {/* Related tools */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#085041]"><Wrench className="h-4 w-4" /> Herramientas relacionadas</h3>
            <p className="text-[11px] text-gray-400">Se muestran como tarjetas en el artículo.</p>
            <div className="space-y-1.5">
              {BLOG_TOOLS.map((tool) => {
                const on = (form.tools ?? []).includes(tool.key);
                return (
                  <button key={tool.key} type="button" onClick={() => toggleTool(tool.key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      on ? "border-[#1D9E75] bg-[#E1F5EE] text-[#085041]" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    <span className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${on ? "bg-[#1D9E75] border-[#1D9E75]" : "border-gray-300"}`}>
                      {on && <CloudCheck className="h-3 w-3 text-white" />}
                    </span>
                    {tool.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual related articles */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#085041]"><ListChecks className="h-4 w-4" /> Artículos relacionados</h3>
            <p className="text-[11px] text-gray-400">Opcional · elige hasta 3. Si no eliges, se muestran automáticos por categoría y tags.</p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {allPosts.filter((p) => p.id !== post.id).length === 0 ? (
                <p className="text-xs text-gray-400">No hay otros artículos aún.</p>
              ) : allPosts.filter((p) => p.id !== post.id).map((p) => {
                const on = (form.related_ids ?? []).includes(p.id);
                const disabled = !on && (form.related_ids ?? []).length >= 3;
                return (
                  <button key={p.id} type="button" onClick={() => toggleRelated(p.id)} disabled={disabled}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all disabled:opacity-40 ${
                      on ? "border-[#1D9E75] bg-[#E1F5EE] text-[#085041]" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    <span className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${on ? "bg-[#1D9E75] border-[#1D9E75]" : "border-gray-300"}`}>
                      {on && <CloudCheck className="h-3 w-3 text-white" />}
                    </span>
                    <span className="truncate">{p.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          {post.id && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#085041]"><Calendar className="h-4 w-4" /> Fechas</h3>
              <p className="text-xs text-gray-600">Publicado el: <span className="font-semibold text-gray-800">{fmtDateTime(form.published_at ?? null)}</span></p>
              <p className="text-xs text-gray-600">Última actualización: <span className="font-semibold text-gray-800">{fmtDateTime(post.updated_at ?? null)}</span></p>
            </div>
          )}

          {/* Danger zone */}
          {post.id && (
            <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-red-600 mb-3">Zona de peligro</h3>
              <button type="button" onClick={onDelete} disabled={deleting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 disabled:opacity-50 transition-all">
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Eliminar artículo
              </button>
            </div>
          )}
        </div>
      </div>

      {preview && <PreviewModal post={{ ...form }} onClose={() => setPreview(false)} />}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function AdminBlogPage() {
  const [posts, setPosts]         = useState<BlogPost[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState<BlogPost | null | "new">(null);
  const [newDraft, setNewDraft]   = useState<{ content: string; category: string } | null>(null);
  const [picker, setPicker]       = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<BlogPost | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("blog_posts").select("*").order("created_at", { ascending: false });
    setPosts((data ?? []).map((p) => ({
      ...p, tags: p.tags ?? [], secondary_keywords: p.secondary_keywords ?? [],
      faqs: p.faqs ?? [], related_ids: p.related_ids ?? [], tools: p.tools ?? [],
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  /* Shared persistence — update when id exists, insert otherwise. Returns the row id. */
  const persistPost = async (data: Partial<BlogPost>, mode: "publish" | "draft" | "keep"): Promise<{ id: string | null; error: string | null }> => {
    const supabase = createClient();
    const id = data.id ?? null;
    const payload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
    delete payload.id;
    if (!payload.category) payload.category = null; // empty category violates the CHECK constraint
    if (mode === "publish") { payload.status = "published"; payload.published_at = data.published_at ?? new Date().toISOString(); }
    else if (mode === "draft") { payload.status = "draft"; payload.published_at = null; }
    // "keep" → leave status / published_at untouched (used by autosave)

    if (id) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", id);
      if (error) console.error("[blog] update error:", error);
      return { id, error: error?.message ?? null };
    }
    const insertPayload = { ...payload, status: (payload.status as string) ?? "draft", created_at: new Date().toISOString() };
    const { data: row, error } = await supabase.from("blog_posts").insert(insertPayload).select("id").single();
    if (error) console.error("[blog] insert error:", error);
    return { id: row?.id ?? null, error: error?.message ?? null };
  };

  const handleSave = async (data: Partial<BlogPost>, publish: boolean): Promise<{ error: string | null }> => {
    setSaving(true);
    const { error } = await persistPost(data, publish ? "publish" : "draft");
    setSaving(false);
    if (error) return { error }; // stay in the editor and surface the error
    await loadPosts();
    setEditing(null);
    setNewDraft(null);
    return { error: null };
  };

  const handleAutoSave = (data: Partial<BlogPost>) => persistPost(data, "keep");

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("blog_posts").delete().eq("id", deleteConfirm.id);
    await loadPosts();
    setDeleting(false);
    setDeleteConfirm(null);
    setEditing(null);
  };

  const toggleStatus = async (post: BlogPost) => {
    const supabase = createClient();
    const newStatus = post.status === "published" ? "draft" : "published";
    await supabase.from("blog_posts").update({
      status: newStatus,
      published_at: newStatus === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", post.id);
    await loadPosts();
  };

  const handleDuplicate = async (post: BlogPost) => {
    setDuplicating(post.id);
    const supabase = createClient();
    const existing = new Set(posts.map((p) => p.slug));
    let slug = `${post.slug}-copia`;
    let n = 2;
    while (existing.has(slug)) { slug = `${post.slug}-copia-${n++}`; }
    const now = new Date().toISOString();
    await supabase.from("blog_posts").insert({
      title: `${post.title} (copia)`,
      slug,
      summary: post.summary,
      content: post.content,
      image_url: post.image_url,
      category: post.category,
      tags: post.tags,
      author: post.author,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      focus_keyword: post.focus_keyword,
      secondary_keywords: post.secondary_keywords,
      faqs: post.faqs,
      cta_type: post.cta_type,
      cta_link: post.cta_link,
      related_ids: post.related_ids,
      tools: post.tools,
      status: "draft",
      published_at: null,
      created_at: now,
      updated_at: now,
    });
    await loadPosts();
    setDuplicating(null);
  };

  const startNew = (tpl: typeof TEMPLATES[number] | null) => {
    setNewDraft(tpl ? { content: templateHtml(tpl.headings), category: tpl.category } : { content: "", category: "" });
    setPicker(false);
    setEditing("new");
  };

  if (editing !== null) {
    const postData = editing === "new"
      ? { ...EMPTY_POST, content: newDraft?.content ?? "", category: newDraft?.category ?? "", title: "", slug: "", status: "draft" as const }
      : editing;
    return (
      <PostEditor
        post={postData}
        allPosts={posts}
        onSave={handleSave}
        onAutoSave={handleAutoSave}
        onDelete={editing !== "new" ? () => setDeleteConfirm(editing as BlogPost) : undefined}
        onBack={() => { setEditing(null); setNewDraft(null); loadPosts(); }}
        saving={saving}
        deleting={deleting}
      />
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[#085041]">Blog</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Escribe y publica artículos sin tocar código.</p>
          </div>
          <button type="button" onClick={() => setPicker(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D9E75] text-white text-sm font-bold hover:bg-[#085041] transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Nuevo artículo
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total", value: posts.length, cls: "text-[#085041]" },
            { label: "Publicados", value: posts.filter((p) => p.status === "published").length, cls: "text-[#1D9E75]" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-bold text-[#085041] mb-1">Aún no hay artículos</p>
            <p className="text-sm text-[#6B7280] mb-6">Crea tu primer artículo para empezar a publicar en el blog.</p>
            <button type="button" onClick={() => setPicker(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1D9E75] text-white text-sm font-bold hover:bg-[#085041] transition-colors">
              <Plus className="h-4 w-4" /> Crear artículo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const { mins } = contentStats(post.content ?? "");
              return (
              <div key={post.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4 flex-wrap">
                {post.image_url && (
                  <img src={post.image_url} alt="" className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      post.status === "published" ? "bg-[#E1F5EE] text-[#085041]" : "bg-gray-100 text-gray-500"
                    }`}>
                      {post.status === "published" ? "Publicado" : "Borrador"}
                    </span>
                    {post.category && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {CAT_LABELS[post.category] ?? post.category}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock className="h-3 w-3" /> {mins} min
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#1E293B] truncate">{post.title}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5 truncate">{post.summary ?? "Sin resumen"}</p>
                  <p className="text-[10px] text-[#6B7280] mt-1">
                    {post.status === "published" && post.published_at
                      ? `Publicado el ${fmtDateTime(post.published_at)}`
                      : `Creado el ${fmtDateTime(post.created_at)}`}
                    {" · "}{post.author}{" · "}/blog/{post.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => handleDuplicate(post)} disabled={duplicating === post.id}
                    className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-all disabled:opacity-50"
                    title="Duplicar (crea un borrador)">
                    {duplicating === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => toggleStatus(post)}
                    className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-all"
                    title={post.status === "published" ? "Despublicar" : "Publicar"}>
                    {post.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setEditing(post)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E1F5EE] text-[#085041] text-xs font-bold hover:bg-[#1D9E75] hover:text-white transition-all">
                    <Edit2 className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button type="button" onClick={() => setDeleteConfirm(post)}
                    className="p-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {picker && <TemplatePicker onPick={startNew} onClose={() => setPicker(false)} />}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-red-600">Eliminar artículo</h3>
              <button type="button" onClick={() => setDeleteConfirm(null)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[#6B7280]">
                ¿Eliminar <span className="font-bold text-[#1E293B]">"{deleteConfirm.title}"</span>? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button type="button" onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280]">Cancelar</button>
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
