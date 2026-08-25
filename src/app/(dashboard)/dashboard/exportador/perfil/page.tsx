"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import {
  Building2, Globe, Package, TrendingUp, Save,
  CheckCircle2, Loader2, X, AlertCircle, Share2, Copy, Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Constants ───────────────────────────────────────────── */

const MARKETS = [
  "USA", "Europa", "Asia", "LATAM", "Canadá",
  "Medio Oriente", "África", "Oceanía", "México", "Reino Unido",
];

const CERTIFICATIONS = [
  "GlobalGAP", "Orgánico USDA", "Fairtrade", "HACCP",
  "ISO 22000", "BRC", "SQF", "Orgánico EU", "FSSC 22000",
];

const PRODUCT_SUGGESTIONS = [
  "Palta Hass", "Uva Red Globe", "Espárrago", "Mango", "Arándano",
  "Quinoa", "Cacao fino", "Café especial", "Jengibre", "Cúrcuma",
  "Maracuyá", "Granadilla", "Alcachofa", "Ají amarillo", "Páprika",
  "Granada", "Limón sutil", "Mandarina", "Pimiento",
];

const INCOTERMS = ["FOB", "CIF", "CFR", "EXW", "DAP", "FCA", "CPT"];

/* ─── Tag input ───────────────────────────────────────────── */

function TagInput({
  label, tags, suggestions, placeholder, onAdd, onRemove,
}: {
  label: string;
  tags: string[];
  suggestions: string[];
  placeholder: string;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  const commit = (val: string) => {
    const v = val.trim();
    if (v && !tags.includes(v)) onAdd(v);
    setInput("");
    setShowDropdown(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(input); }
    if (e.key === "Backspace" && !input && tags.length) onRemove(tags[tags.length - 1]);
  };

  return (
    <div>
      <label className="block text-xs font-bold text-[#085041] mb-1.5">{label}</label>
      <div className="relative">
        <div className="min-h-[44px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 flex flex-wrap gap-1.5 focus-within:border-[#1D9E75] focus-within:ring-2 focus-within:ring-[#1D9E75]/20 transition-all">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 bg-[#E1F5EE] text-[#085041] text-[11px] font-semibold px-2.5 py-1 rounded-lg">
              {t}
              <button type="button" onClick={() => onRemove(t)} className="hover:text-red-500 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowDropdown(true); }}
            onKeyDown={handleKey}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] text-xs text-[#1E293B] outline-none bg-transparent placeholder:text-gray-400"
          />
        </div>
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto">
            {filtered.slice(0, 8).map((s) => (
              <button key={s} type="button" onMouseDown={() => commit(s)}
                className="w-full text-left px-3 py-2 text-xs text-[#1E293B] hover:bg-[#E1F5EE] hover:text-[#085041] font-medium transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Enter o coma para agregar · Backspace para eliminar</p>
    </div>
  );
}

/* ─── Section wrapper ─────────────────────────────────────── */

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div className="w-7 h-7 rounded-lg bg-[#E1F5EE] flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-[#1D9E75]" />
        </div>
        <h2 className="text-sm font-bold text-[#085041]">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

/* ─── Field ───────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#085041] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-[#1E293B] placeholder:text-gray-400 focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all";

/* ─── Page ────────────────────────────────────────────────── */

export default function ExportadorPerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [razonSocial, setRazonSocial] = useState("");
  const [ruc, setRuc] = useState("");
  const [aniosOperando, setAniosOperando] = useState("");
  const [volumenAnual, setVolumenAnual] = useState("");
  const [incoterms, setIncoterms] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [descripcion, setDescripcion] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data: ep } = await supabase
        .from("exporter_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (ep) {
        setRazonSocial(ep.razon_social ?? "");
        setRuc(ep.ruc ?? "");
        setAniosOperando(ep.years_operating?.toString() ?? "");
        setVolumenAnual(ep.annual_volume_tm?.toString() ?? "");
        setIncoterms(ep.incoterms ?? []);
        setMarkets(ep.destination_markets ?? []);
        setProducts(ep.products ?? []);
        setCertifications(ep.certifications ?? []);
        setDescripcion(ep.description ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  const profileUrl = typeof window !== "undefined" && userId
    ? `${window.location.origin}/perfil/${userId}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { /* noop */ }
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from("exporter_profiles").upsert({
      user_id: user.id,
      razon_social: razonSocial,
      ruc,
      years_operating: aniosOperando ? parseInt(aniosOperando) : null,
      annual_volume_tm: volumenAnual ? parseFloat(volumenAnual) : null,
      incoterms,
      destination_markets: markets,
      products,
      certifications,
      description: descripcion,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (error) {
      setSaveError(error.message ?? "No se pudo guardar. Intenta de nuevo.");
      setTimeout(() => setSaveError(null), 5000);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      // Best-effort CRM sync en Brevo. El endpoint completa nombre/país/fechas desde profiles.
      try {
        await fetch("/api/brevo/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, empresa: razonSocial, rol: "exportador" }),
        });
      } catch { /* best-effort */ }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Perfil de empresa</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Información de tu empresa exportadora visible a productores y forwarders.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {saveError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {saveError}
            </div>
          )}
          <div className="flex items-center gap-2">
            {/* Share */}
            <div className="relative">
              <button type="button" onClick={() => setShareOpen(s => !s)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-[#6B7280] text-xs font-bold hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors">
                <Share2 className="h-4 w-4" /> Compartir perfil
              </button>
              {shareOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 p-3 bg-white border border-gray-200 rounded-xl shadow-lg z-50 space-y-2">
                  <button type="button" onClick={handleCopy}
                    className="w-full flex items-center justify-center gap-2 border border-gray-200 text-[#374151] py-1.5 rounded-lg text-xs font-semibold hover:border-[#1D9E75] transition-colors">
                    {linkCopied ? <Check className="h-3.5 w-3.5 text-[#1D9E75]" /> : <Copy className="h-3.5 w-3.5" />}
                    {linkCopied ? "¡Copiado!" : "Copiar link"}
                  </button>
                  <a href={`https://wa.me/?text=${encodeURIComponent("Mira mi perfil en MARKARU: " + profileUrl)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
                    WhatsApp
                  </a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#1877F2] text-white py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
                    Facebook
                  </a>
                  <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#0A66C2] text-white py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
                    LinkedIn
                  </a>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                saved     ? "bg-[#E1F5EE] text-[#085041] border border-[#1D9E75]/30" :
                saveError ? "bg-red-500 text-white hover:bg-red-600" :
                            "bg-[#085041] text-white hover:bg-[#1D9E75]"
              } disabled:opacity-60`}
            >
              {saving    ? <><Loader2    className="h-4 w-4 animate-spin" /> Guardando...</> :
               saved     ? <><CheckCircle2 className="h-4 w-4 text-[#1D9E75]" /> Guardado</> :
               saveError ? <><AlertCircle  className="h-4 w-4" /> Error al guardar</> :
                           <><Save         className="h-4 w-4" /> Guardar cambios</>}
            </button>
          </div>
        </div>
      </div>

      {/* Datos empresa */}
      <Section icon={Building2} title="Datos de la empresa">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Razón social">
              <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)}
                placeholder="Empresa Exportadora S.A.C." className={inputCls} />
            </Field>
          </div>
          <Field label="RUC">
            <input value={ruc} onChange={(e) => setRuc(e.target.value)}
              placeholder="20123456789" maxLength={11} className={inputCls} />
          </Field>
          <Field label="Años operando">
            <div className="relative">
              <input value={aniosOperando} onChange={(e) => setAniosOperando(e.target.value)}
                type="number" min={0} max={100} placeholder="5" className={`${inputCls} pr-10`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-semibold">años</span>
            </div>
          </Field>
          <Field label="Volumen anual exportado">
            <div className="relative">
              <input value={volumenAnual} onChange={(e) => setVolumenAnual(e.target.value)}
                type="number" min={0} placeholder="500" className={`${inputCls} pr-8`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-semibold">TM</span>
            </div>
          </Field>
          <div>
            <Field label="Incoterms que maneja">
              <div className="flex flex-wrap gap-2 pt-1">
                {INCOTERMS.map((inc) => (
                  <button key={inc} type="button"
                    onClick={() => setIncoterms((p) => p.includes(inc) ? p.filter((x) => x !== inc) : [...p, inc])}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      incoterms.includes(inc)
                        ? "bg-[#085041] text-white border-[#085041]"
                        : "bg-white text-[#6B7280] border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
                    }`}>
                    {inc}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>
      </Section>

      {/* Mercados */}
      <Section icon={Globe} title="Mercados destino">
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((m) => (
            <button key={m} type="button"
              onClick={() => setMarkets((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m])}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                markets.includes(m)
                  ? "bg-[#1D9E75] text-white border-[#1D9E75] shadow-sm"
                  : "bg-white text-[#6B7280] border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
              }`}>
              {m}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3">Haz clic en los mercados donde exportas actualmente.</p>
      </Section>

      {/* Productos */}
      <Section icon={Package} title="Productos que exportas">
        <TagInput
          label="Productos"
          tags={products}
          suggestions={PRODUCT_SUGGESTIONS}
          placeholder="Escribe un producto y presiona Enter..."
          onAdd={(v) => setProducts((p) => [...p, v])}
          onRemove={(v) => setProducts((p) => p.filter((x) => x !== v))}
        />
        <div className="mt-4">
          <label className="block text-xs font-bold text-[#085041] mb-2">Certificaciones que manejas</label>
          <div className="flex flex-wrap gap-2">
            {CERTIFICATIONS.map((c) => (
              <button key={c} type="button"
                onClick={() => setCertifications((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                  certifications.includes(c)
                    ? "bg-[#E1F5EE] text-[#085041] border-[#1D9E75]"
                    : "bg-white text-[#6B7280] border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Descripción */}
      <Section icon={TrendingUp} title="Descripción de la empresa">
        <div>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Describe tu empresa, trayectoria, ventajas competitivas..."
            className={`${inputCls} resize-none`}
          />
          <p className="text-[10px] text-gray-400 mt-1 text-right">{descripcion.length}/500</p>
        </div>
      </Section>
    </div>
  );
}

