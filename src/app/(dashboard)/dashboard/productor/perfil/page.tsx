"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Check, X, Plus, Camera, MapPin, Phone, AlertCircle, Share2, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { CountryCombobox } from "@/components/CountryCombobox";
import { ImageHint } from "@/components/ImageHint";

/* ─── Constants ───────────────────────────────────────────── */

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];


const PERU_REGIONS = [
  "Amazonas","Áncash","Apurímac","Arequipa","Ayacucho","Cajamarca",
  "Callao","Cusco","Huancavelica","Huánuco","Ica","Junín",
  "La Libertad","Lambayeque","Lima","Loreto","Madre de Dios",
  "Moquegua","Pasco","Piura","Puno","San Martín","Tacna",
  "Tumbes","Ucayali",
];

const SUGGESTED_PRODUCTS = [
  "Palta Hass","Espárragos","Arándanos","Café verde","Cacao",
  "Quinoa","Maca","Mangos","Uvas de mesa","Mandarina",
  "Limón","Paprika","Maíz amarillo","Papa nativa","Jengibre",
];

/* ─── Types ───────────────────────────────────────────────── */

interface FormData {
  fullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  country: string;
  region: string;
  province: string;
  district: string;
  farmName: string;
  hectares: string;
  annualProductionTm: string;
  description: string;
}

const EMPTY_FORM: FormData = {
  fullName: "", phone: "", whatsapp: "", email: "",
  country: "Perú", region: "", province: "", district: "",
  farmName: "", hectares: "", annualProductionTm: "", description: "",
};

/* ─── Shared styles ───────────────────────────────────────── */

const lbl = "block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5";
const inp = "w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-[#1E293B] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition";

/* ─── Section wrapper ─────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-3.5 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-bold text-[#085041]">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ─── Products tags ───────────────────────────────────────── */

function ProductTags({
  products, onChange,
}: {
  products: string[];
  onChange: (p: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const add = (tag: string) => {
    const t = tag.trim();
    if (t && !products.includes(t)) onChange([...products, t]);
    setInput("");
    setShowSuggestions(false);
  };

  const remove = (tag: string) => onChange(products.filter((p) => p !== tag));

  const suggestions = SUGGESTED_PRODUCTS.filter(
    (s) => !products.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div>
      {/* Existing tags */}
      <div className="flex flex-wrap gap-2 mb-3 min-h-[36px]">
        {products.map((p) => (
          <span key={p}
            className="inline-flex items-center gap-1.5 bg-[#E1F5EE] text-[#085041] text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200">
            {p}
            <button type="button" onClick={() => remove(p)} className="text-[#1D9E75] hover:text-red-500 transition-colors">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {products.length === 0 && (
          <span className="text-xs text-gray-400 self-center">Sin productos agregados</span>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Escribe un producto y presiona Enter"
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); } }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className={inp}
          />
          <button type="button" onClick={() => add(input)}
            className="px-3 py-2.5 rounded-xl bg-[#1D9E75] text-white hover:bg-[#085041] transition-colors flex-shrink-0">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && input.length > 0 && suggestions.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {suggestions.slice(0, 5).map((s) => (
              <button key={s} type="button" onMouseDown={() => add(s)}
                className="w-full text-left px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#E1F5EE] hover:text-[#085041] transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[11px] text-[#6B7280] mt-1.5">Enter o coma para agregar · Sugerencias disponibles al escribir</p>
    </div>
  );
}

/* ─── Harvest months ──────────────────────────────────────── */

function HarvestMonths({
  selected, onChange,
}: {
  selected: number[];
  onChange: (m: number[]) => void;
}) {
  const toggle = (idx: number) =>
    onChange(selected.includes(idx) ? selected.filter((m) => m !== idx) : [...selected, idx]);

  return (
    <div>
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
        {MONTHS.map((month, idx) => {
          const active = selected.includes(idx);
          return (
            <button
              key={month}
              type="button"
              onClick={() => toggle(idx)}
              className={`flex flex-col items-center py-2.5 px-1 rounded-xl border-2 text-xs font-bold transition-all ${
                active
                  ? "bg-[#1D9E75] border-[#1D9E75] text-white shadow-sm"
                  : "bg-white border-gray-200 text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75]"
              }`}
            >
              <span className="text-[9px] font-semibold mb-0.5 opacity-60">{idx + 1}</span>
              {month}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[#6B7280] mt-2">
        {selected.length === 0
          ? "Ningún mes seleccionado"
          : `Cosecha en: ${selected.sort((a, b) => a - b).map((i) => MONTHS[i]).join(", ")}`}
      </p>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function PerfilProductorPage() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [products, setProducts] = useState<string[]>([]);
  const [harvestMonths, setHarvestMonths] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const set = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* Load profile data */
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserId(user.id);

      /* Load from profiles */
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      /* Load from producer_profiles */
      const { data: producer } = await supabase
        .from("producer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setForm({
        fullName:          profile?.name           ?? user.user_metadata?.full_name ?? "",
        phone:             profile?.phone          ?? user.user_metadata?.phone     ?? "",
        whatsapp:          producer?.whatsapp      ?? "",
        email:             user.email              ?? "",
        country:           producer?.country       ?? user.user_metadata?.country   ?? "Perú",
        region:            producer?.region        ?? "",
        province:          producer?.province      ?? "",
        district:          producer?.district      ?? "",
        farmName:          producer?.farm_name     ?? "",
        hectares:          producer?.hectares      ? String(producer.hectares)          : "",
        annualProductionTm:producer?.annual_production_tm ? String(producer.annual_production_tm) : "",
        description:       producer?.description   ?? "",
      });

      setProducts(Array.isArray(producer?.products) ? producer.products : []);
      setHarvestMonths(Array.isArray(producer?.harvest_months) ? producer.harvest_months : []);
      setLoading(false);
    }
    load();
  }, []);

  /* Save changes */
  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    const supabase = createClient();

    const results = await Promise.all([
      supabase.from("profiles").update({
        name: form.fullName,
        phone: form.phone,
      }).eq("user_id", userId),

      supabase.from("producer_profiles").upsert({
        user_id: userId,
        whatsapp: form.whatsapp,
        country: form.country,
        region: form.region,
        province: form.province,
        district: form.district,
        farm_name: form.farmName,
        hectares: form.hectares ? parseFloat(form.hectares) : null,
        annual_production_tm: form.annualProductionTm ? parseFloat(form.annualProductionTm) : null,
        products,
        harvest_months: harvestMonths,
        description: form.description,
      }),
    ]);

    setSaving(false);
    const err = results.find((r) => r.error)?.error;
    if (err) {
      setSaveError(err.message ?? "No se pudo guardar. Intenta de nuevo.");
      setTimeout(() => setSaveError(null), 5000);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      // Best-effort CRM sync en Brevo (nombre/empresa/país). No bloquea el guardado.
      try {
        const parts = String(form.fullName || "").trim().split(/\s+/).filter(Boolean);
        await fetch("/api/brevo/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            nombre: parts[0] || form.fullName,
            apellido: parts.slice(1).join(" "),
            empresa: form.farmName,
            pais: form.country,
            rol: "productor",
          }),
        });
      } catch { /* best-effort */ }
    }
  };

  const initials = form.fullName
    ? form.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Mi perfil</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Esta información es visible para exportadores e importadores.
          </p>
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
                saved
                  ? "bg-green-500 text-white"
                  : saveError
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-[#1D9E75] text-white hover:bg-[#085041]"
              } disabled:opacity-60`}
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
              ) : saved ? (
                <><Check className="h-4 w-4" /> ¡Guardado!</>
              ) : saveError ? (
                <><AlertCircle className="h-4 w-4" /> Error al guardar</>
              ) : (
                <><Save className="h-4 w-4" /> Guardar cambios</>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-3xl">

        {/* Avatar + datos básicos */}
        <Section title="Foto y datos básicos">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-[#085041] flex items-center justify-center text-white text-2xl font-extrabold shadow-md">
                {initials}
              </div>
              <button type="button" disabled
                className="flex items-center gap-1 text-[10px] font-semibold text-[#6B7280] hover:text-[#1D9E75] transition-colors cursor-not-allowed opacity-50">
                <Camera className="h-3 w-3" /> Cambiar foto
              </button>
              <ImageHint className="text-center max-w-[8rem]" />
            </div>

            {/* Name + email */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={lbl}>Nombre completo *</label>
                <input type="text" placeholder="Juan Carlos Pérez Quispe"
                  value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input type="email" value={form.email} disabled
                  className={`${inp} bg-gray-50 text-[#6B7280] cursor-not-allowed`} />
              </div>
            </div>
          </div>
        </Section>

        {/* Contacto */}
        <Section title="Información de contacto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>
                <Phone className="inline h-3 w-3 mr-1" />Teléfono
              </label>
              <input type="tel" placeholder="+51 999 888 777"
                value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>WhatsApp</label>
              <input type="tel" placeholder="+51 999 888 777"
                value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={inp} />
              <p className="text-[10px] text-[#6B7280] mt-1">Los compradores podrán contactarte por WhatsApp.</p>
            </div>
          </div>
        </Section>

        {/* Ubicación */}
        <Section title="Ubicación">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>
                <MapPin className="inline h-3 w-3 mr-1" />País
              </label>
              <CountryCombobox value={form.country} onChange={v => set("country", v)} className={inp} placeholder="Escribe para buscar país..." />
            </div>
            <div>
              <label className={lbl}>Región / Departamento</label>
              {form.country === "Perú" ? (
                <select value={form.region} onChange={(e) => set("region", e.target.value)} className={inp}>
                  <option value="">Seleccionar región</option>
                  {PERU_REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              ) : (
                <input type="text" placeholder="Región" value={form.region}
                  onChange={(e) => set("region", e.target.value)} className={inp} />
              )}
            </div>
            <div>
              <label className={lbl}>Provincia</label>
              <input type="text" placeholder="Ej: Ica"
                value={form.province} onChange={(e) => set("province", e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Distrito</label>
              <input type="text" placeholder="Ej: Chincha Alta"
                value={form.district} onChange={(e) => set("district", e.target.value)} className={inp} />
            </div>
          </div>
        </Section>

        {/* Datos de la finca */}
        <Section title="Mi finca">
          <div className="space-y-5">
            <div>
              <label className={lbl}>Nombre de la finca *</label>
              <input type="text" placeholder="Finca La Esperanza"
                value={form.farmName} onChange={(e) => set("farmName", e.target.value)} className={inp} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Hectáreas cultivadas</label>
                <div className="relative">
                  <input type="number" placeholder="0.0" min="0" step="0.5"
                    value={form.hectares} onChange={(e) => set("hectares", e.target.value)}
                    className={`${inp} pr-10`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7280]">ha</span>
                </div>
              </div>
              <div>
                <label className={lbl}>Producción anual</label>
                <div className="relative">
                  <input type="number" placeholder="0.0" min="0" step="0.5"
                    value={form.annualProductionTm} onChange={(e) => set("annualProductionTm", e.target.value)}
                    className={`${inp} pr-10`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7280]">TM</span>
                </div>
              </div>
            </div>

            <div>
              <label className={lbl}>Productos que cultivo</label>
              <ProductTags products={products} onChange={setProducts} />
            </div>
          </div>
        </Section>

        {/* Meses de cosecha */}
        <Section title="Meses de cosecha">
          <HarvestMonths selected={harvestMonths} onChange={setHarvestMonths} />
        </Section>

        {/* Descripción */}
        <Section title="Descripción de la finca">
          <div>
            <label className={lbl}>Cuéntale a los compradores sobre tu finca</label>
            <textarea
              rows={4}
              placeholder="Describe tu finca, métodos de cultivo, certificaciones, historia, valores... Esta información aparece en tu perfil público."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={`${inp} resize-none`}
            />
            <p className="text-[11px] text-[#6B7280] mt-1 text-right">
              {form.description.length} / 600 caracteres
            </p>
          </div>
        </Section>

        {/* Bottom save */}
        <div className="flex justify-end pb-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
              saved
                ? "bg-green-500 text-white"
                : "bg-[#1D9E75] text-white hover:bg-[#085041]"
            } disabled:opacity-60`}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
            ) : saved ? (
              <><Check className="h-4 w-4" /> ¡Cambios guardados!</>
            ) : (
              <><Save className="h-4 w-4" /> Guardar cambios</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

