"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2, Clock, XCircle, MapPin, ArrowRight,
  Package, DollarSign, Truck, ChevronDown, ChevronUp,
  Loader2, MessageCircle, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

/* ─── Types ───────────────────────────────────────────────── */

type QuoteStatus = "pending" | "accepted" | "rejected" | "expired";
type Filter      = "todas" | QuoteStatus;

interface Quote {
  id: string;
  rfq_id: string;
  total_price_usd: number;
  freight_price_usd: number | null;
  local_charges_usd: number | null;
  carrier: string | null;
  departure_date: string | null;
  transit_days: number | null;
  validity_days: number | null;
  notes: string | null;
  fee_usd: number | null;
  status: string;
  created_at: string;
  rfq_logistics: {
    origin_port: string;
    destination_port: string;
    cargo_type: string;
    product_type: string | null;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: "Pendiente", color: "bg-amber-100 text-amber-700",  icon: Clock },
  accepted: { label: "Aceptada",  color: "bg-[#E1F5EE] text-[#085041]", icon: CheckCircle2 },
  rejected: { label: "Rechazada", color: "bg-gray-100 text-gray-500",    icon: XCircle },
  expired:  { label: "Expirada",  color: "bg-gray-100 text-gray-400",    icon: AlertCircle },
};

const CARGO_LABELS: Record<string, string> = {
  FCL_20: "FCL 20'", FCL_40: "FCL 40'", REEFER_20: "Reefer 20'", REEFER_40: "Reefer 40'",
  LCL: "LCL", AEREO: "Aéreo", TERRESTRE: "Terrestre",
};

/* ─── Quote card ──────────────────────────────────────────── */

function QuoteCard({ quote }: { quote: Quote }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const rfq = quote.rfq_logistics;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
      quote.status === "rejected" || quote.status === "expired" ? "opacity-75" : ""
    } ${quote.status === "accepted" ? "border-[#1D9E75]/40" : "border-gray-200"}`}>
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>
                <StatusIcon className="h-3 w-3" />
                {cfg.label}
              </span>
              {rfq && (
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {CARGO_LABELS[rfq.cargo_type] ?? rfq.cargo_type}
                </span>
              )}
            </div>

            {rfq ? (
              <>
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#085041] mb-0.5">
                  <MapPin className="h-3.5 w-3.5 text-[#1D9E75] flex-shrink-0" />
                  {rfq.origin_port}
                  <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                  {rfq.destination_port}
                </div>
                {rfq.product_type && (
                  <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                    <Package className="h-3.5 w-3.5 flex-shrink-0" />
                    {rfq.product_type}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">RFQ no disponible</p>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-xl font-extrabold text-[#085041]">
              USD {quote.total_price_usd.toLocaleString()}
            </p>
            <p className="text-[10px] text-[#6B7280]">total cotizado</p>
          </div>
        </div>

        {/* Key data row */}
        <div className="mt-3 flex items-center gap-4 flex-wrap text-xs text-[#6B7280]">
          {quote.carrier && (
            <span><span className="font-semibold text-[#1E293B]">{quote.carrier}</span></span>
          )}
          {quote.departure_date && (
            <span>Zarpe: <span className="font-semibold text-[#1E293B]">
              {new Date(quote.departure_date).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
            </span></span>
          )}
          {quote.transit_days && (
            <span><span className="font-semibold text-[#1E293B]">{quote.transit_days}</span> días tránsito</span>
          )}
          {quote.validity_days && (
            <span>Válida <span className="font-semibold text-[#1E293B]">{quote.validity_days}</span>d</span>
          )}
          <span className="ml-auto text-[10px]">Enviada {fmtDate(quote.created_at)}</span>
        </div>
      </div>

      {/* Accepted: link to chat */}
      {quote.status === "accepted" && (
        <div className="mx-5 mb-4 bg-[#E1F5EE] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
            <p className="text-xs font-bold text-[#085041]">Cotización aceptada por el exportador</p>
          </div>
          <Link href="/dashboard/mensajes"
            className="flex-shrink-0 inline-flex items-center gap-1.5 bg-[#1D9E75] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#085041] transition-colors">
            <MessageCircle className="h-3 w-3" /> Chat
          </Link>
        </div>
      )}

      {/* Expand toggle */}
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-2.5 bg-gray-50 border-t border-gray-100 text-xs font-semibold text-[#6B7280] hover:bg-gray-100 transition-colors">
        <span>Ver detalle completo</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 py-4 border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              { label: "Naviera",        value: quote.carrier ?? "—" },
              { label: "Fecha zarpe",    value: quote.departure_date ? new Date(quote.departure_date).toLocaleDateString("es-PE", { day: "numeric", month: "long" }) : "—" },
              { label: "Días tránsito",  value: quote.transit_days ? `${quote.transit_days} días` : "—" },
              { label: "Validez",        value: quote.validity_days ? `${quote.validity_days} días` : "—" },
              { label: "Flete",          value: quote.freight_price_usd ? `USD ${quote.freight_price_usd.toLocaleString()}` : "—" },
              { label: "Gastos locales", value: quote.local_charges_usd != null ? `USD ${quote.local_charges_usd.toLocaleString()}` : "—" },
              { label: "Total",          value: `USD ${quote.total_price_usd.toLocaleString()}` },
            ].map((r) => (
              <div key={r.label}>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">{r.label}</p>
                <p className="font-semibold text-[#1E293B]">{r.value}</p>
              </div>
            ))}
          </div>
          {quote.notes && (
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Notas</p>
              <p className="text-xs text-[#1E293B] leading-relaxed">{quote.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function MisCotizacionesPage() {
  const [quotes, setQuotes]   = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<Filter>("todas");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("logistics_quotes")
        .select("*, rfq_logistics(origin_port, destination_port, cargo_type, product_type)")
        .eq("forwarder_id", user.id)
        .order("created_at", { ascending: false });

      if (error) console.error("[logistics_quotes]", error);

      setQuotes(
        (data ?? []).map((q) => ({
          ...q,
          rfq_logistics: Array.isArray(q.rfq_logistics)
            ? (q.rfq_logistics[0] ?? null)
            : q.rfq_logistics,
        }))
      );
      setLoading(false);
    }
    load();
  }, []);

  const counts = useMemo(() => ({
    todas:    quotes.length,
    pending:  quotes.filter((q) => q.status === "pending").length,
    accepted: quotes.filter((q) => q.status === "accepted").length,
    rejected: quotes.filter((q) => q.status === "rejected" || q.status === "expired").length,
  }), [quotes]);

  const filtered = useMemo(() => {
    if (filter === "todas") return quotes;
    if (filter === "rejected") return quotes.filter((q) => q.status === "rejected" || q.status === "expired");
    return quotes.filter((q) => q.status === filter);
  }, [quotes, filter]);

  const TABS: { key: Filter; label: string; color?: string }[] = [
    { key: "todas",    label: "Todas" },
    { key: "pending",  label: "Pendiente", color: "bg-amber-100 text-amber-700" },
    { key: "accepted", label: "Aceptada",  color: "bg-[#E1F5EE] text-[#085041]" },
    { key: "rejected", label: "Rechazada", color: "bg-gray-100 text-gray-500" },
  ];

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
      <div>
        <h1 className="text-2xl font-extrabold text-[#085041]">Mis cotizaciones</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Seguimiento de todas las cotizaciones enviadas.</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total",     value: counts.todas,    cls: "text-[#085041]" },
          { label: "Pendiente", value: counts.pending,  cls: "text-amber-600" },
          { label: "Aceptada",  value: counts.accepted, cls: "text-[#1D9E75]" },
          { label: "Rechazada", value: counts.rejected, cls: "text-[#6B7280]" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-3 py-3 shadow-sm text-center">
            <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-[#6B7280] mt-0.5 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => {
          const count = t.key === "todas" ? counts.todas
            : t.key === "pending"  ? counts.pending
            : t.key === "accepted" ? counts.accepted
            : counts.rejected;
          return (
            <button key={t.key} type="button" onClick={() => setFilter(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                filter === t.key
                  ? "bg-[#085041] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75]"
              }`}>
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                filter === t.key ? "bg-white/20 text-white" : t.color ?? "bg-gray-100 text-[#6B7280]"
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Quote list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#085041]">Sin cotizaciones en esta categoría</p>
          <p className="text-xs text-[#6B7280] mt-1">Ve a RFQs disponibles para enviar tu primera cotización.</p>
        </div>
      ) : (
        <div className="space-y-4 pb-6">
          {filtered.map((q) => <QuoteCard key={q.id} quote={q} />)}
        </div>
      )}

      {quotes.length === 0 && (
        <div className="text-center">
          <Link href="/dashboard/forwarder/rfqs"
            className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#085041] transition-colors">
            <Truck className="h-4 w-4" /> Ver RFQs disponibles
          </Link>
        </div>
      )}
    </div>
  );
}

