"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Truck, Package, Clock, MapPin, Weight, ArrowRight,
  X, Loader2, CheckCircle2, Filter, Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Types ───────────────────────────────────────────────── */

type CargoFilter = "todos" | "FCL_20" | "FCL_40" | "REEFER_20" | "REEFER_40" | "LCL" | "AEREO" | "TERRESTRE";

interface LogisticRFQ {
  id: string;
  requester_id: string;
  origin_port: string;
  destination_port: string;
  cargo_type: string;
  product_type: string | null;
  weight_kg: number | null;
  volume_cbm: number | null;
  incoterm: string | null;
  cargo_date: string | null;
  expires_at: string | null;
  include_insurance: boolean;
  include_customs: boolean;
  created_at: string;
}

interface QuoteFormState {
  freightPrice: string;
  localCharges: string;
  carrier: string;
  departureDate: string;
  transitDays: string;
  validityDays: string;
  notes: string;
}

/* ─── Service-type matching ───────────────────────────────── */

const CARGO_TO_SERVICE: Record<string, string[]> = {
  FCL_20:    ["agente_maritimo"],
  FCL_40:    ["agente_maritimo"],
  REEFER_20: ["agente_maritimo"],
  REEFER_40: ["agente_maritimo"],
  LCL:       ["agente_maritimo", "consolidador_lcl"],
  AEREO:     ["agente_aereo"],
  TERRESTRE: ["transporte"],
};

function rfqMatchesServices(cargoType: string, myServices: string[]): boolean {
  if (!myServices.length) return false;
  const needed = CARGO_TO_SERVICE[cargoType] ?? [];
  return needed.some((s) => myServices.includes(s));
}

const CARGO_LABELS: Record<string, string> = {
  FCL_20: "FCL 20'", FCL_40: "FCL 40'", REEFER_20: "Reefer 20'", REEFER_40: "Reefer 40'",
  LCL: "LCL", AEREO: "Aéreo", TERRESTRE: "Terrestre",
};

/* ─── Countdown badge ─────────────────────────────────────── */

function CountdownBadge({ expiresAt }: { expiresAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  if (!expiresAt) return null;
  const msLeft = new Date(expiresAt).getTime() - now;
  const hLeft  = msLeft / 3600000;

  if (hLeft <= 0) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
      <Clock className="h-3 w-3" /> Expirado
    </span>
  );

  const hStr   = hLeft < 1 ? "< 1h" : `${Math.floor(hLeft)}h`;
  const urgent = hLeft < 12;
  const medium = hLeft >= 12 && hLeft < 24;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
      urgent ? "bg-red-100 text-red-600 animate-pulse" :
      medium ? "bg-amber-100 text-amber-700" :
               "bg-gray-100 text-gray-600"
    }`}>
      <Clock className="h-3 w-3" /> {hStr} para responder
    </span>
  );
}

/* ─── Quote modal ─────────────────────────────────────────── */

function QuoteModal({ rfq, onClose, onSubmit }: {
  rfq: LogisticRFQ;
  onClose: () => void;
  onSubmit: (rfq: LogisticRFQ, data: QuoteFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<QuoteFormState>({
    freightPrice: "", localCharges: "", carrier: "",
    departureDate: "", transitDays: "", validityDays: "7", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const freightNum    = parseFloat(form.freightPrice) || 0;
  const localNum      = parseFloat(form.localCharges) || 0;
  const totalPrice    = freightNum + localNum;
  const isValid       = !!form.freightPrice && !!form.transitDays;

  const set = <K extends keyof QuoteFormState>(k: K, v: QuoteFormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    await onSubmit(rfq, form);
    setSubmitting(false);
  };

  const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-[#1E293B] placeholder:text-gray-400 focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-extrabold text-[#085041]">Enviar cotización</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {rfq.origin_port} → {rfq.destination_port} · {CARGO_LABELS[rfq.cargo_type] ?? rfq.cargo_type}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Freight + local charges */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#085041] mb-1.5">
                Flete (USD) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">$</span>
                <input value={form.freightPrice} onChange={(e) => set("freightPrice", e.target.value)}
                  type="number" min={0} placeholder="2500" className={`${inputCls} pl-7`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#085041] mb-1.5">Gastos locales (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">$</span>
                <input value={form.localCharges} onChange={(e) => set("localCharges", e.target.value)}
                  type="number" min={0} placeholder="150" className={`${inputCls} pl-7`} />
              </div>
            </div>
          </div>

          {/* Auto total */}
          {totalPrice > 0 && (
            <div className="flex items-center justify-between bg-[#E1F5EE] rounded-xl px-4 py-2.5">
              <span className="text-xs font-semibold text-[#085041]">Total cotización</span>
              <span className="text-sm font-extrabold text-[#085041]">USD {totalPrice.toLocaleString()}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#085041] mb-1.5">Naviera / Transportista</label>
            <input value={form.carrier} onChange={(e) => set("carrier", e.target.value)}
              placeholder="MSC, Maersk, Hapag-Lloyd..." className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#085041] mb-1.5">Fecha de zarpe</label>
              <input value={form.departureDate} onChange={(e) => set("departureDate", e.target.value)}
                type="date" min={new Date().toISOString().split("T")[0]} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#085041] mb-1.5">
                Días en tránsito <span className="text-red-500">*</span>
              </label>
              <input value={form.transitDays} onChange={(e) => set("transitDays", e.target.value)}
                type="number" min={1} placeholder="21" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#085041] mb-1.5">Validez de cotización (días)</label>
            <input value={form.validityDays} onChange={(e) => set("validityDays", e.target.value)}
              type="number" min={1} placeholder="7" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#085041] mb-1.5">Notas adicionales</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
              rows={3} maxLength={400}
              placeholder="Incluye THC, booking con 7 días de anticipación..."
              className={`${inputCls} resize-none`} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={!isValid || submitting}
            className="flex-1 py-2.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...</> : "Enviar cotización"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── RFQ Card ────────────────────────────────────────────── */

function RFQCard({ rfq, quoted, matches, companyName, onQuote }: {
  rfq: LogisticRFQ; quoted: boolean; matches: boolean; companyName: string; onQuote: () => void;
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all ${
      quoted    ? "border-[#1D9E75]/40 opacity-80" :
      matches   ? "border-[#1D9E75]/60 hover:shadow-md" :
                  "border-gray-200 hover:shadow-md"
    }`}>
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold text-[#6B7280]">{companyName}</span>
            <span className="text-xs font-bold bg-[#E1F5EE] text-[#085041] px-2.5 py-1 rounded-lg">
              {CARGO_LABELS[rfq.cargo_type] ?? rfq.cargo_type}
            </span>
            <CountdownBadge expiresAt={rfq.expires_at} />
            {matches && !quoted && (
              <span className="text-[10px] font-bold text-[#1D9E75] bg-[#E1F5EE] px-2 py-0.5 rounded-full">
                ✓ Coincide con tu perfil
              </span>
            )}
            {quoted && (
              <span className="text-[10px] font-bold text-[#1D9E75] bg-[#E1F5EE] px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Cotizado
              </span>
            )}
          </div>
          {rfq.incoterm && <p className="text-[11px] text-[#6B7280]">Incoterm: {rfq.incoterm}</p>}
        </div>
      </div>

      {/* Info grid */}
      <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-1">Ruta</p>
          <div className="flex items-center gap-1 text-xs font-bold text-[#1E293B]">
            <MapPin className="h-3.5 w-3.5 text-[#1D9E75] flex-shrink-0" />
            {rfq.origin_port}
            <ArrowRight className="h-3 w-3 text-gray-400" />
            {rfq.destination_port}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-1">Producto</p>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#1E293B]">
            <Package className="h-3.5 w-3.5 text-[#1D9E75] flex-shrink-0" />
            {rfq.product_type ?? "—"}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-1">Peso / Vol.</p>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#1E293B]">
            <Weight className="h-3.5 w-3.5 text-[#1D9E75] flex-shrink-0" />
            {rfq.weight_kg ? `${(rfq.weight_kg / 1000).toFixed(1)} TM` : "—"}
            {rfq.volume_cbm ? ` · ${rfq.volume_cbm} m³` : ""}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-1">Fecha carga</p>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#1E293B]">
            <Calendar className="h-3.5 w-3.5 text-[#1D9E75] flex-shrink-0" />
            {rfq.cargo_date
              ? new Date(rfq.cargo_date).toLocaleDateString("es-PE", { day: "numeric", month: "short" })
              : "—"}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <button type="button" onClick={onQuote} disabled={quoted}
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
            quoted
              ? "bg-gray-100 text-gray-400 cursor-default"
              : "bg-[#085041] text-white hover:bg-[#1D9E75]"
          }`}>
          {quoted
            ? <><CheckCircle2 className="h-4 w-4" /> Cotización enviada</>
            : <><Truck className="h-4 w-4" /> Cotizar</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function ForwarderRFQsPage() {
  const [rfqs, setRfqs]                         = useState<LogisticRFQ[]>([]);
  const [myServices, setMyServices]             = useState<string[]>([]);
  const [requesterNames, setRequesterNames]     = useState<Record<string, string>>({});
  const [loading, setLoading]                   = useState(true);
  const [quotedIds, setQuotedIds]               = useState<Set<string>>(new Set());
  const [activeRFQ, setActiveRFQ]               = useState<LogisticRFQ | null>(null);
  const [cargoFilter, setCargoFilter]           = useState<CargoFilter>("todos");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const [rfqsRes, profileRes] = await Promise.all([
        supabase
          .from("rfq_logistics")
          .select("id, requester_id, origin_port, destination_port, cargo_type, product_type, weight_kg, volume_cbm, incoterm, cargo_date, expires_at, include_insurance, include_customs, created_at")
          .in("status", ["open", "quoted"])
          .order("created_at", { ascending: false }),
        user
          ? supabase
              .from("forwarder_profiles")
              .select("service_types")
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (rfqsRes.error) console.error("[rfq_logistics]", rfqsRes.error);
      const rfqData = rfqsRes.data ?? [];
      setMyServices(profileRes.data?.service_types ?? []);
      setRfqs(rfqData);

      // Load company names for all requesters
      const ids = [...new Set(rfqData.map((r) => r.requester_id).filter(Boolean))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, business_name")
          .in("user_id", ids);
        if (profiles) {
          const map: Record<string, string> = {};
          for (const p of profiles) {
            map[p.user_id] = (p.business_name as string | null) ?? (p.name as string | null) ?? "Empresa";
          }
          setRequesterNames(map);
        }
      }

      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const base = cargoFilter === "todos" ? rfqs : rfqs.filter((r) => r.cargo_type === cargoFilter);
    if (!myServices.length) return base;
    // Matching RFQs appear first
    const matching    = base.filter((r) => rfqMatchesServices(r.cargo_type, myServices));
    const nonMatching = base.filter((r) => !rfqMatchesServices(r.cargo_type, myServices));
    return [...matching, ...nonMatching];
  }, [rfqs, cargoFilter, myServices]);

  const handleQuoteSubmit = async (rfq: LogisticRFQ, form: QuoteFormState) => {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      alert("Error de sesión: no se pudo identificar al usuario. Recarga la página.");
      return;
    }

    const freightPrice    = parseFloat(form.freightPrice) || 0;
    const localCharges    = parseFloat(form.localCharges) || 0;
    const total_price_usd = freightPrice + localCharges;

    const payload = {
      rfq_id:            rfq.id,
      forwarder_id:      user.id,
      freight_price_usd: freightPrice,
      local_charges_usd: localCharges,
      total_price_usd,
      carrier:           form.carrier || null,
      departure_date:    form.departureDate || null,
      transit_days:      parseInt(form.transitDays) || null,
      validity_days:     parseInt(form.validityDays) || 7,
      notes:             form.notes || null,
      status:            "pending",
    };

    console.log("[logistics_quotes] inserting:", payload);

    const { data: inserted, error } = await supabase
      .from("logistics_quotes")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[logistics_quotes] INSERT ERROR:", error);
      alert(`Error al enviar cotización:\nCódigo: ${error.code}\n${error.message}`);
      return;
    }

    console.log("[logistics_quotes] saved:", inserted);
    setQuotedIds((prev) => new Set([...prev, rfq.id]));
    setActiveRFQ(null);
  };

  const CARGO_FILTERS: { key: CargoFilter; label: string }[] = [
    { key: "todos",     label: "Todos" },
    { key: "FCL_20",    label: "FCL 20'" },
    { key: "FCL_40",    label: "FCL 40'" },
    { key: "REEFER_20", label: "Reefer 20'" },
    { key: "REEFER_40", label: "Reefer 40'" },
    { key: "LCL",       label: "LCL" },
    { key: "AEREO",     label: "Aéreo" },
    { key: "TERRESTRE", label: "Terrestre" },
  ];

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">RFQs disponibles</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Solicitudes de cotización logística abiertas. Tienes 48 h para responder cada una.
          </p>
          {myServices.length > 0 && (
            <p className="text-xs text-[#1D9E75] mt-1 font-medium">
              Las solicitudes que coinciden con tu perfil aparecen primero y llevan el badge "Coincide con tu perfil".
            </p>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-[#6B7280] flex-shrink-0" />
          {CARGO_FILTERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setCargoFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                cargoFilter === f.key
                  ? "bg-[#085041] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75]"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-[#6B7280]">
          <span>
            <span className="font-bold text-[#085041]">{filtered.length}</span>{" "}
            RFQ{filtered.length !== 1 ? "s" : ""} disponible{filtered.length !== 1 ? "s" : ""}
          </span>
          <span>
            {quotedIds.size} cotización{quotedIds.size !== 1 ? "es" : ""} enviada{quotedIds.size !== 1 ? "s" : ""}
          </span>
        </div>

        {/* RFQ list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <Truck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#085041]">Sin RFQs en esta categoría</p>
            <p className="text-xs text-[#6B7280] mt-1">Vuelve pronto, se publican nuevas solicitudes cada día.</p>
          </div>
        ) : (
          <div className="space-y-4 pb-6">
            {filtered.map((rfq) => (
              <RFQCard
                key={rfq.id}
                rfq={rfq}
                quoted={quotedIds.has(rfq.id)}
                matches={rfqMatchesServices(rfq.cargo_type, myServices)}
                companyName={requesterNames[rfq.requester_id] ?? "Empresa"}
                onQuote={() => setActiveRFQ(rfq)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {activeRFQ && (
        <QuoteModal
          rfq={activeRFQ}
          onClose={() => setActiveRFQ(null)}
          onSubmit={handleQuoteSubmit}
        />
      )}
    </>
  );
}

