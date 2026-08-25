"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import {
  Building2, Truck, Globe, Package, DollarSign,
  Save, CheckCircle2, Loader2, Plus, Trash2, X, AlertCircle, Share2, Copy, Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Constants ───────────────────────────────────────────── */

const SERVICE_TYPES = [
  { key: "agente_maritimo",  label: "Agente de carga internacional (marítimo)", hint: "FCL, LCL, Reefer" },
  { key: "agente_aereo",     label: "Agente de carga internacional (aéreo)",    hint: "Carga aérea" },
  { key: "transporte",       label: "Transporte terrestre local (finca → puerto)", hint: "Terrestre" },
  { key: "agente_aduana",    label: "Agente de aduana",                         hint: "Trámites aduaneros" },
  { key: "consolidador_lcl", label: "Consolidador LCL",                         hint: "LCL" },
];

const CARGO_TYPES = [
  { key: "FCL_20",    label: "FCL 20'" },
  { key: "FCL_40",    label: "FCL 40'" },
  { key: "REEFER",    label: "Reefer" },
  { key: "LCL",       label: "LCL" },
  { key: "AEREO",     label: "Aéreo" },
  { key: "TERRESTRE", label: "Terrestre" },
];

const ROUTE_SUGGESTIONS = [
  "Callao → Rotterdam",
  "Callao → Miami",
  "Callao → Amberes",
  "Callao → Los Ángeles",
  "Callao → Shanghái",
  "Callao → Madrid",
  "Paita → Rotterdam",
  "Paita → Miami",
  "Callao → Tokio",
  "Callao → Hong Kong",
  "Callao → Santos",
  "Callao → Hamburgo",
];

/* ─── Route tag input ─────────────────────────────────────── */

function RouteTagInput({ tags, onAdd, onRemove }: {
  tags: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void;
}) {
  const [input, setInput] = useState("");
  const [showDrop, setShowDrop] = useState(false);

  const filtered = ROUTE_SUGGESTIONS.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  const commit = (val: string) => {
    const v = val.trim();
    if (v && !tags.includes(v)) onAdd(v);
    setInput(""); setShowDrop(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); commit(input); }
    if (e.key === "Backspace" && !input && tags.length) onRemove(tags[tags.length - 1]);
  };

  return (
    <div className="relative">
      <div className="min-h-[44px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 flex flex-wrap gap-1.5 focus-within:border-[#1D9E75] focus-within:ring-2 focus-within:ring-[#1D9E75]/20 transition-all">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 bg-[#E1F5EE] text-[#085041] text-[11px] font-semibold px-2.5 py-1 rounded-lg">
            {t}
            <button type="button" onClick={() => onRemove(t)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowDrop(true); }}
          onKeyDown={handleKey}
          onFocus={() => setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 150)}
          placeholder={tags.length === 0 ? "Ej: Callao → Rotterdam" : ""}
          className="flex-1 min-w-[160px] text-xs text-[#1E293B] outline-none bg-transparent placeholder:text-gray-400"
        />
      </div>
      {showDrop && filtered.length > 0 && (
        <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
          {filtered.slice(0, 8).map((s) => (
            <button key={s} type="button" onMouseDown={() => commit(s)}
              className="w-full text-left px-3 py-2 text-xs text-[#1E293B] hover:bg-[#E1F5EE] hover:text-[#085041] font-medium transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}
      <p className="text-[10px] text-gray-400 mt-1">Enter para agregar · Backspace para eliminar</p>
    </div>
  );
}

/* ─── Rate row ────────────────────────────────────────────── */

interface RateRow { route: string; cargoType: string; price: string; currency: string; notes: string; }

function RateTable({ rates, onChange }: {
  rates: RateRow[];
  onChange: (rates: RateRow[]) => void;
}) {
  const addRow = () => onChange([...rates, { route: "", cargoType: "FCL_20", price: "", currency: "USD", notes: "" }]);
  const removeRow = (i: number) => onChange(rates.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof RateRow, value: string) =>
    onChange(rates.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const cellCls = "px-2 py-2 text-xs text-[#1E293B] border-b border-gray-100 bg-white";
  const inputCls = "w-full text-xs text-[#1E293B] bg-transparent outline-none placeholder:text-gray-300";

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] bg-gray-50 border-b border-gray-200">
        {["Ruta", "Tipo carga", "Precio", "Moneda", "Notas", ""].map((h) => (
          <div key={h} className="px-2 py-2.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{h}</div>
        ))}
      </div>

      {/* Rows */}
      {rates.map((r, i) => (
        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] hover:bg-gray-50 transition-colors">
          <div className={cellCls}>
            <input value={r.route} onChange={(e) => updateRow(i, "route", e.target.value)}
              placeholder="Callao → Rotterdam" className={inputCls} />
          </div>
          <div className={cellCls}>
            <select value={r.cargoType} onChange={(e) => updateRow(i, "cargoType", e.target.value)}
              className={`${inputCls} cursor-pointer`}>
              {CARGO_TYPES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div className={cellCls}>
            <input value={r.price} onChange={(e) => updateRow(i, "price", e.target.value)}
              type="number" min={0} placeholder="1200" className={inputCls} />
          </div>
          <div className={cellCls}>
            <select value={r.currency} onChange={(e) => updateRow(i, "currency", e.target.value)}
              className={`${inputCls} cursor-pointer`}>
              <option>USD</option><option>EUR</option><option>PEN</option>
            </select>
          </div>
          <div className={cellCls}>
            <input value={r.notes} onChange={(e) => updateRow(i, "notes", e.target.value)}
              placeholder="incluye THC, válido 30 días" className={inputCls} />
          </div>
          <div className={`${cellCls} flex items-center justify-center`}>
            <button type="button" onClick={() => removeRow(i)}
              className="text-gray-300 hover:text-red-500 transition-colors p-1">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {/* Add row */}
      <button type="button" onClick={addRow}
        className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-[#1D9E75] hover:bg-[#E1F5EE] transition-colors border-t border-gray-100">
        <Plus className="h-4 w-4" /> Agregar tarifa
      </button>
    </div>
  );
}

/* ─── Section ─────────────────────────────────────────────── */

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

const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-[#1E293B] placeholder:text-gray-400 focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all";

/* ─── Page ────────────────────────────────────────────────── */

export default function ForwarderPerfilPage() {
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [ruc, setRuc]               = useState("");
  const [licenciaMtc, setLicenciaMtc] = useState("");
  const [services, setServices]     = useState<string[]>([]);
  const [routes, setRoutes]         = useState<string[]>([]);
  const [cargoTypes, setCargoTypes] = useState<string[]>([]);
  const [rates, setRates]           = useState<RateRow[]>([
    { route: "Callao → Rotterdam", cargoType: "FCL_20", price: "1400", currency: "USD", notes: "incluye THC" },
  ]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const { data: fp } = await supabase.from("forwarder_profiles").select("*").eq("user_id", user.id).single();
      if (fp) {
        setRuc(fp.ruc ?? "");
        setLicenciaMtc(fp.licencia_mtc ?? "");
        setServices(fp.service_types ?? []);
        setRoutes(fp.routes ?? []);
        setCargoTypes(fp.cargo_types ?? []);
        setRates(fp.reference_rates ?? rates);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleService  = (k: string) => setServices((p) => p.includes(k) ? p.filter((x) => x !== k) : [...p, k]);
  const toggleCargo    = (k: string) => setCargoTypes((p) => p.includes(k) ? p.filter((x) => x !== k) : [...p, k]);

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

    const { error } = await supabase.from("forwarder_profiles").upsert({
      user_id: user.id,
      ruc,
      licencia_mtc: licenciaMtc,
      service_types: services,
      routes,
      cargo_types: cargoTypes,
      reference_rates: rates,
    });

    setSaving(false);
    if (error) {
      setSaveError(error.message ?? "No se pudo guardar. Intenta de nuevo.");
      setTimeout(() => setSaveError(null), 5000);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      // Best-effort CRM sync en Brevo. El endpoint completa nombre/empresa/país/fechas desde profiles.
      try {
        await fetch("/api/brevo/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, rol: "forwarder" }),
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
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Perfil de forwarder</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Tu información visible a exportadores al recibir RFQs.</p>
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
            <button type="button" onClick={handleSave} disabled={saving}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                saved     ? "bg-[#E1F5EE] text-[#085041] border border-[#1D9E75]/30" :
                saveError ? "bg-red-500 text-white hover:bg-red-600" :
                            "bg-[#085041] text-white hover:bg-[#1D9E75]"
              } disabled:opacity-60`}>
              {saving    ? <><Loader2      className="h-4 w-4 animate-spin" /> Guardando...</> :
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
          <div>
            <label className="block text-xs font-bold text-[#085041] mb-1.5">RUC</label>
            <input value={ruc} onChange={(e) => setRuc(e.target.value)}
              placeholder="20123456789" maxLength={11} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#085041] mb-1.5">Licencia MTC</label>
            <input value={licenciaMtc} onChange={(e) => setLicenciaMtc(e.target.value)}
              placeholder="Nro. de licencia MTC" className={inputCls} />
          </div>
        </div>
      </Section>

      {/* Tipos de servicio */}
      <Section icon={Truck} title="Tipos de servicio">
        <div className="space-y-2.5">
          {SERVICE_TYPES.map((s) => (
            <label key={s.key} className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => toggleService(s.key)}
                className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border-2 flex-shrink-0 transition-all cursor-pointer ${
                  services.includes(s.key)
                    ? "bg-[#1D9E75] border-[#1D9E75]"
                    : "border-gray-300 group-hover:border-[#1D9E75]"
                }`}>
                {services.includes(s.key) && <CheckCircle2 className="h-3 w-3 text-white" />}
              </div>
              <div>
                <span className="text-xs font-medium text-[#1E293B]">{s.label}</span>
                <span className="ml-2 text-[10px] text-[#6B7280] bg-gray-100 px-1.5 py-0.5 rounded-full">{s.hint}</span>
              </div>
            </label>
          ))}
        </div>
      </Section>

      {/* Rutas */}
      <Section icon={Globe} title="Rutas que operan">
        <RouteTagInput tags={routes} onAdd={(v) => setRoutes((p) => [...p, v])} onRemove={(v) => setRoutes((p) => p.filter((x) => x !== v))} />
      </Section>

      {/* Tipos de carga */}
      <Section icon={Package} title="Tipos de carga">
        <div className="flex flex-wrap gap-2">
          {CARGO_TYPES.map((c) => (
            <button key={c.key} type="button" onClick={() => toggleCargo(c.key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                cargoTypes.includes(c.key)
                  ? "bg-[#085041] text-white border-[#085041] shadow-sm"
                  : "bg-white text-[#6B7280] border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
              }`}>
              {c.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Tarifas referenciales */}
      <Section icon={DollarSign} title="Tarifas referenciales por ruta">
        <RateTable rates={rates} onChange={setRates} />
        <p className="text-[10px] text-gray-400 mt-2">
          Las tarifas son referenciales. La cotización final se define al responder cada RFQ.
        </p>
      </Section>
    </div>
  );
}

