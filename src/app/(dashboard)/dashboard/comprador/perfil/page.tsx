"use client";

import { useState, useEffect } from "react";
import {
  User, Package, TrendingUp, Award, Save, Loader2, CheckCircle2,
  Share2, Copy, Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { CountryCombobox } from "@/components/CountryCombobox";

/* ─── Constants ───────────────────────────────────────────── */


const MARKET_TYPES = [
  "Retail / supermercados", "Food service / restaurantes", "Industria / procesamiento",
  "Distribuidores mayoristas", "E-commerce", "Otro",
];

const CERTIFICATIONS_LIST = [
  "GlobalGAP", "Orgánico USDA", "Fairtrade", "Orgánico EU",
  "HACCP", "ISO 22000", "BRC",
];

const PRODUCTS_LIST = [
  "Palta Hass", "Uva de mesa", "Espárrago", "Mango", "Arándano",
  "Quinoa", "Cacao", "Café especial", "Jengibre", "Cúrcuma",
  "Maracuyá", "Alcachofa", "Páprika", "Citrus", "Otros",
];

/* ─── Field wrapper ───────────────────────────────────────── */

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#085041] mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-[#1E293B] placeholder:text-gray-400 focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all";

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
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

/* ─── Page ────────────────────────────────────────────────── */

export default function PerfilCompradorPage() {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [userId, setUserId]     = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied]     = useState(false);

  const [name, setName]                   = useState("");
  const [businessName, setBusinessName]   = useState("");
  const [country, setCountry]             = useState("");
  const [market, setMarket]               = useState("");
  const [annualVolume, setAnnualVolume]   = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [requiredCerts, setRequiredCerts] = useState<string[]>([]);
  const [bio, setBio]                     = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("name, business_name, country, bio")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setName(data.name ?? "");
        setBusinessName(data.business_name ?? "");
        setCountry(data.country ?? "");
        setBio(data.bio ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const profileUrl = typeof window !== "undefined" && userId
    ? `${window.location.origin}/perfil/${userId}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from("profiles").update({
      name,
      business_name: businessName,
      country,
      bio,
    }).eq("user_id", user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);

    // Best-effort CRM sync en Brevo. El endpoint completa apellidos/fechas desde profiles.
    try {
      const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
      await fetch("/api/brevo/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          nombre: parts[0] || name,
          apellido: parts.slice(1).join(" "),
          empresa: businessName,
          pais: country,
          rol: "comprador",
        }),
      });
    } catch { /* best-effort */ }
  };

  if (loading) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Mi perfil</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Información de tu empresa compradora.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Share */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShareOpen(s => !s)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-[#6B7280] text-xs font-bold hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors"
            >
              <Share2 className="h-4 w-4" /> Compartir perfil
            </button>
            {shareOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 p-3 bg-white border border-gray-200 rounded-xl shadow-lg z-50 space-y-2">
                <button type="button" onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 text-[#374151] py-1.5 rounded-lg text-xs font-semibold hover:border-[#1D9E75] transition-colors">
                  {copied ? <Check className="h-3.5 w-3.5 text-[#1D9E75]" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "¡Copiado!" : "Copiar link"}
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors shadow-sm disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Guardado" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Empresa */}
      <Section icon={User} title="Información de la empresa">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre de la empresa">
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ej: Global Fresh Imports LLC" className={inputCls} />
          </Field>
          <Field label="Nombre del contacto">
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre completo" className={inputCls} />
          </Field>
          <Field label="País de origen">
            <CountryCombobox value={country} onChange={setCountry} className={inputCls} placeholder="Escribe para buscar país..." />
          </Field>
          <Field label="Tipo de mercado">
            <select value={market} onChange={(e) => setMarket(e.target.value)} className={inputCls}>
              <option value="">Selecciona...</option>
              {MARKET_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Descripción de la empresa" hint="¿Qué importas? ¿Para qué mercado?">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)}
              rows={3} maxLength={400}
              placeholder="Ej: Importadora especializada en frutas frescas para el mercado minorista alemán..."
              className={`${inputCls} resize-none`} />
          </Field>
        </div>
      </Section>

      {/* Productos que importa */}
      <Section icon={Package} title="Productos que importas">
        <p className="text-xs text-[#6B7280] mb-3">Selecciona los productos de tu interés para recibir mejores coincidencias.</p>
        <div className="flex flex-wrap gap-2">
          {PRODUCTS_LIST.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggleItem(selectedProducts, setSelectedProducts, p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                selectedProducts.includes(p)
                  ? "bg-[#085041] text-white border-[#085041]"
                  : "bg-white text-[#6B7280] border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
              }`}>
              {p}
            </button>
          ))}
        </div>
      </Section>

      {/* Volumen y certificaciones */}
      <Section icon={TrendingUp} title="Capacidad de compra">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Volumen anual estimado" hint="Total en toneladas métricas por año">
            <div className="relative">
              <input value={annualVolume} onChange={(e) => setAnnualVolume(e.target.value)}
                type="number" min={0} placeholder="500" className={`${inputCls} pr-8`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-semibold">TM/año</span>
            </div>
          </Field>
        </div>
      </Section>

      {/* Certificaciones que exige */}
      <Section icon={Award} title="Certificaciones que exiges a proveedores">
        <p className="text-xs text-[#6B7280] mb-3">Estas certificaciones aparecerán en tus solicitudes de compra.</p>
        <div className="flex flex-wrap gap-2">
          {CERTIFICATIONS_LIST.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleItem(requiredCerts, setRequiredCerts, c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                requiredCerts.includes(c)
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-[#6B7280] border-gray-200 hover:border-amber-400 hover:text-amber-600"
              }`}>
              {c}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

