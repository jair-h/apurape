"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Box,
  Snowflake,
  Plane,
  Truck,
  Layers,
  MapPin,
  Calendar,
  Shield,
  FileText,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { PortCombobox } from "@/components/PortCombobox";

/* ─── Constants ───────────────────────────────────────────── */

const PRODUCTS = [
  "Espárragos", "Palta Hass", "Arándanos", "Café verde",
  "Cacao", "Quinoa", "Maca", "Mangos", "Insumos agrícolas", "Otro",
];

const INCOTERMS = ["FOB", "CIF", "CFR", "EXW", "DAP", "DDP"];

const CARGO_TYPES = [
  { id: "FCL_20",    label: "FCL 20'",    icon: Package },
  { id: "FCL_40",    label: "FCL 40'",    icon: Box },
  { id: "REEFER_20", label: "Reefer 20'", icon: Snowflake },
  { id: "REEFER_40", label: "Reefer 40'", icon: Snowflake },
  { id: "LCL",       label: "LCL",        icon: Layers },
  { id: "AEREO",     label: "Aéreo",      icon: Plane },
  { id: "TERRESTRE", label: "Terrestre",  icon: Truck },
] as const;

/* ─── Types ───────────────────────────────────────────────── */

type Direction = "export" | "import";
type Status = "idle" | "loading" | "submitted";

interface FormData {
  direction: Direction;
  origin: string;
  destination: string;
  cargoType: string;
  product: string;
  weight: string;
  volume: string;
  date: string;
  incoterm: string;
  insurance: boolean;
  customs: boolean;
  internalTransport: boolean;
}

/* ─── Shared CSS ──────────────────────────────────────────── */

const lbl = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1";
const inp = "w-full px-2.5 py-2 text-xs rounded-lg border border-gray-200 bg-white text-[#1E293B] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition";

/* ─── Form column (240 px) ────────────────────────────────── */

function FormColumn({
  form, setForm, onSubmit, loading, userCountry,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: () => void;
  loading: boolean;
  userCountry: string;
}) {
  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const isExport = form.direction === "export";

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 bg-[#085041] flex-shrink-0">
        <h2 className="text-sm font-bold text-white">Cotizador Logístico</h2>
        <p className="text-[11px] text-green-300 mt-0.5">Recibe cotizaciones en 48h</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Toggle */}
        <div>
          <p className={lbl}>Operación</p>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {(["export", "import"] as Direction[]).map((d) => (
              <button key={d} type="button" onClick={() => set("direction", d)}
                className={`flex-1 py-1.5 text-[11px] font-semibold transition-colors ${
                  form.direction === d ? "bg-[#1D9E75] text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}>
                {d === "export" ? "Exportación" : "Importación"}
              </button>
            ))}
          </div>
        </div>

        {/* Origen */}
        <div>
          <label className={lbl}>
            <MapPin className="inline h-3 w-3 mr-0.5" />
            {isExport ? "Puerto de origen" : "Puerto de origen"}
          </label>
          <PortCombobox
            value={form.origin}
            onChange={(v) => set("origin", v)}
            priorityCountry={isExport ? userCountry : undefined}
            placeholder="Buscar puerto o escribir..."
            className={inp}
          />
        </div>

        {/* Destino */}
        <div>
          <label className={lbl}>
            <MapPin className="inline h-3 w-3 mr-0.5" />
            {!isExport ? "Puerto de destino" : "Puerto de destino"}
          </label>
          <PortCombobox
            value={form.destination}
            onChange={(v) => set("destination", v)}
            priorityCountry={!isExport ? userCountry : undefined}
            placeholder="Buscar puerto o escribir..."
            className={inp}
          />
        </div>

        {/* Tipo de carga */}
        <div>
          <p className={lbl}>Tipo de carga</p>
          <div className="grid grid-cols-2 gap-1.5">
            {CARGO_TYPES.map((ct) => {
              const active = form.cargoType === ct.id;
              return (
                <button key={ct.id} type="button" onClick={() => set("cargoType", ct.id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[11px] font-semibold transition-all ${
                    active ? "border-[#1D9E75] bg-[#E1F5EE] text-[#085041]"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  }`}>
                  <ct.icon className={`h-4 w-4 ${active ? "text-[#1D9E75]" : "text-gray-400"}`} />
                  {ct.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Producto */}
        <div>
          <label className={lbl}>Producto</label>
          <input
            list="product-suggestions"
            type="text"
            placeholder="Ej. Espárragos, Palta Hass..."
            value={form.product}
            onChange={(e) => set("product", e.target.value)}
            className={inp}
          />
          <datalist id="product-suggestions">
            {PRODUCTS.map((p) => <option key={p} value={p} />)}
          </datalist>
        </div>

        {/* Peso + Volumen */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Peso (kg)</label>
            <input type="number" placeholder="18000" value={form.weight}
              onChange={(e) => set("weight", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Vol. (m³)</label>
            <input type="number" placeholder="33" value={form.volume}
              onChange={(e) => set("volume", e.target.value)} className={inp} />
          </div>
        </div>

        {/* Fecha + Incoterm */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>
              <Calendar className="inline h-3 w-3 mr-0.5" />Fecha
            </label>
            <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Incoterm</label>
            <select value={form.incoterm} onChange={(e) => set("incoterm", e.target.value)} className={inp}>
              <option value="">—</option>
              {INCOTERMS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>

        {/* Servicios adicionales */}
        <div>
          <p className={lbl}>Servicios adicionales</p>
          <div className="space-y-2.5">
            {[
              { key: "insurance" as const, label: "Incluir seguro de carga", Icon: Shield },
              { key: "customs" as const, label: "Gestión aduanera", Icon: FileText },
              { key: "internalTransport" as const, label: "Transporte interno", Icon: Truck },
            ].map(({ key, label, Icon }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={form[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-[#1D9E75] focus:ring-[#1D9E75]" />
                <Icon className="h-3.5 w-3.5 text-gray-400 group-hover:text-[#1D9E75] transition-colors" />
                <span className="text-xs text-gray-600 group-hover:text-gray-800">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0 bg-white">
        <button type="button" onClick={onSubmit}
          disabled={loading || !form.origin || !form.destination || !form.cargoType}
          className="w-full flex items-center justify-center gap-2 bg-[#1D9E75] text-white py-2.5 rounded-lg text-sm font-bold hover:bg-[#085041] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            : "Solicitar cotizaciones"}
        </button>
      </div>
    </aside>
  );
}

/* ─── Empty state ─────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-12">
      <div className="w-28 h-28 mb-7">
        <svg viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="56" cy="56" r="56" fill="#E1F5EE" />
          <rect x="24" y="44" width="64" height="40" rx="5" stroke="#1D9E75" strokeWidth="2" fill="white" />
          <path d="M24 54h64" stroke="#1D9E75" strokeWidth="2" />
          <rect x="32" y="62" width="18" height="14" rx="2" fill="#E1F5EE" stroke="#1D9E75" strokeWidth="1.5" />
          <path d="M60 68h20M60 73h14" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M56 16v20" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" />
          <path d="M48 24l8-8 8 8" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-xl font-extrabold text-[#085041] mb-2">Solicita tu cotización logística</h3>
      <p className="text-sm text-[#6B7280] max-w-xs leading-relaxed mb-8">
        Completa el formulario y recibirás cotizaciones de forwarders verificados en{" "}
        <span className="font-bold text-[#1D9E75]">menos de 48 horas</span>.
      </p>
      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        {[
          { value: "48h", label: "Respuesta máx." },
          { value: "3+", label: "Cotizaciones" },
          { value: "100%", label: "Verificados" },
        ].map((s) => (
          <div key={s.label} className="bg-[#E1F5EE] rounded-xl py-3 px-2 text-center">
            <p className="text-lg font-extrabold text-[#1D9E75]">{s.value}</p>
            <p className="text-[10px] text-[#6B7280] mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Submitted state ─────────────────────────────────────── */

function SubmittedState({ form, rfqId }: { form: FormData; rfqId: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-12">
      <div className="w-20 h-20 rounded-full bg-[#E1F5EE] flex items-center justify-center mb-6">
        <CheckCircle2 className="h-10 w-10 text-[#1D9E75]" />
      </div>

      <h3 className="text-xl font-extrabold text-[#085041] mb-3">¡Solicitud enviada!</h3>

      {(form.origin || form.destination) && (
        <div className="inline-flex items-center gap-2 bg-[#085041] text-white text-xs font-semibold px-4 py-2 rounded-full mb-5">
          <MapPin className="h-3.5 w-3.5" />
          {form.origin || "Origen"} → {form.destination || "Destino"}
          {form.cargoType && (
            <span className="bg-[#1D9E75] px-2 py-0.5 rounded-full">
              {form.cargoType.replace("_", " ")}
            </span>
          )}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 max-w-sm mb-7 text-left">
        <p className="text-sm text-amber-900 leading-relaxed">
          <span className="font-bold block mb-1">Tu solicitud está activa.</span>
          Los agentes de carga enviarán cotizaciones pronto (puede tomar unas horas). Puedes cerrar y volver luego.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs text-left mb-6">
        {[
          { label: "Solicitud registrada",   done: true },
          { label: "Forwarders notificados", done: true },
          { label: "Esperando cotizaciones", done: false },
          { label: "Comparar y confirmar",   done: false },
        ].map((step) => (
          <div key={step.label} className="flex items-center gap-3 text-sm">
            {step.done
              ? <CheckCircle2 className="h-5 w-5 text-[#1D9E75] flex-shrink-0" />
              : <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex-shrink-0" />}
            <span className={step.done ? "text-[#1E293B]" : "text-gray-400"}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <Link
        href={`/dashboard/logistica/mis-solicitudes${rfqId ? `?rfq=${rfqId}` : ""}`}
        className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#085041] transition-colors shadow-md">
        Ver mis cotizaciones →
      </Link>
    </div>
  );
}


/* ─── Page ────────────────────────────────────────────────── */

const INITIAL_FORM: FormData = {
  direction: "export", origin: "", destination: "", cargoType: "",
  product: "", weight: "", volume: "", date: "", incoterm: "",
  insurance: false, customs: false, internalTransport: false,
};

function CotizarInner() {
  const searchParams = useSearchParams();
  const opId    = searchParams.get("op");
  const product = searchParams.get("product");
  const port    = searchParams.get("port");

  const [form, setForm] = useState<FormData>(() => ({
    ...INITIAL_FORM,
    product: product ?? "",
    origin:  port    ?? "",
  }));
  const [status, setStatus] = useState<Status>("idle");
  const [rfqId, setRfqId] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string>("Perú");

  // Load user's country from auth metadata to prioritize their local ports
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const country = user?.user_metadata?.country as string | undefined;
      if (country) setUserCountry(country);
    });
  }, []);

  // If URL params arrive after mount (navigation), sync them once
  useEffect(() => {
    if (product || port) {
      setForm(prev => ({
        ...prev,
        product: product ?? prev.product,
        origin:  port    ?? prev.origin,
      }));
    }
  }, [product, port]);

  const handleSubmit = async () => {
    setStatus("loading");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: inserted } = await supabase.from("rfq_logistics").insert({
      requester_id:      user?.id ?? null,
      operation_id:      opId ?? null,
      origin_port:       form.origin,
      destination_port:  form.destination,
      cargo_type:        form.cargoType,
      product_type:      form.product || null,
      weight_kg:         form.weight ? parseFloat(form.weight) : null,
      volume_cbm:        form.volume ? parseFloat(form.volume) : null,
      cargo_date:        form.date || null,
      incoterm:          form.incoterm || null,
      include_insurance: form.insurance,
      include_customs:   form.customs,
      include_inland:    form.internalTransport,
      status:            "open",
      deadline_hours:    48,
      expires_at:        new Date(Date.now() + 48 * 3600000).toISOString(),
    }).select("id").single();
    setRfqId(inserted?.id ?? null);
    setStatus("submitted");
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Form — full width on mobile when idle; hidden on mobile when submitted */}
      <div className={`${status === "submitted" ? "hidden md:flex" : "flex"} w-full md:w-auto flex-shrink-0`}>
        <FormColumn form={form} setForm={setForm} onSubmit={handleSubmit} loading={status === "loading"} userCountry={userCountry} />
      </div>

      {/* Result panel — full width on mobile when submitted; hidden on mobile when idle */}
      <div className={`${status === "submitted" ? "flex" : "hidden md:flex"} flex-1 flex-col overflow-hidden bg-gray-50`}>
        <div className="flex-1 overflow-y-auto">
          <div className="h-full flex items-center justify-center">
            {status === "idle"
              ? <EmptyState />
              : <SubmittedState form={form} rfqId={rfqId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CotizarPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-7 w-7 text-[#1D9E75] animate-spin" />
      </div>
    }>
      <CotizarInner />
    </Suspense>
  );
}
