"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText, TrendingUp, ClipboardList, DollarSign,
  ArrowRight, Loader2, MapPin, Clock, Package,
  CheckCircle2, XCircle, AlertCircle, Plane, Truck,
  Layers, Box, Snowflake, Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Helpers ─────────────────────────────────────────────── */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

function hoursLeft(createdAt: string): number {
  return Math.max(0, 48 - (Date.now() - new Date(createdAt).getTime()) / 3600000);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Hace menos de 1h";
  if (h < 24) return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Hace 1 día" : `Hace ${d} días`;
}

/* ─── Types ───────────────────────────────────────────────── */

type LogisticsRFQ = {
  id: string;
  origin_port: string;
  destination_port: string;
  cargo_type: string;
  product_type: string | null;
  weight_kg: number | null;
  cargo_date: string | null;
  incoterm: string | null;
  include_insurance: boolean;
  status: string;
  created_at: string;
};

type MyQuote = {
  id: string;
  rfq_id: string;
  total_price_usd: number;
  carrier: string | null;
  status: string;
  created_at: string;
  rfq_logistics?: { origin_port: string; destination_port: string; cargo_type: string } | null;
};

/* ─── Constants ───────────────────────────────────────────── */

const CARGO_INFO: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  FCL_20:    { label: "FCL 20'",   icon: Package,  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  FCL_40:    { label: "FCL 40'",   icon: Box,      cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  FCL_40HC:  { label: "FCL 40HC",  icon: Box,      cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  REEFER:    { label: "Reefer",    icon: Snowflake, cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  LCL:       { label: "LCL",      icon: Layers,   cls: "bg-purple-50 text-purple-700 border-purple-200" },
  AEREO:     { label: "Aéreo",    icon: Plane,    cls: "bg-sky-50 text-sky-700 border-sky-200" },
  TERRESTRE: { label: "Terrestre", icon: Truck,   cls: "bg-orange-50 text-orange-700 border-orange-200" },
};

const QUOTE_STATUS: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  pending:  { label: "Pendiente", cls: "bg-amber-50 text-amber-700 border-amber-200",   icon: AlertCircle },
  accepted: { label: "Aceptada",  cls: "bg-[#E1F5EE] text-[#085041] border-green-200", icon: CheckCircle2 },
  rejected: { label: "Rechazada", cls: "bg-red-50 text-red-600 border-red-200",         icon: XCircle },
};

/* ─── Shared UI ───────────────────────────────────────────── */

function MetricCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-extrabold text-[#085041] leading-tight">{value}</p>
        <p className="text-xs text-[#6B7280] mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-[#085041]">{title}</h2>
      {href && (
        <Link href={href} className="text-xs font-semibold text-[#1D9E75] hover:text-[#085041] flex items-center gap-1 transition-colors">
          Ver todo <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, message, action, actionHref }: {
  icon: React.ElementType; message: string; action?: string; actionHref?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
      <Icon className="h-8 w-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-[#6B7280]">{message}</p>
      {action && actionHref && (
        <Link href={actionHref}
          className="inline-block mt-3 text-xs font-bold text-[#1D9E75] hover:text-[#085041] transition-colors">
          {action} →
        </Link>
      )}
    </div>
  );
}

function CountdownBadge({ hours }: { hours: number }) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
      hours < 12 ? "bg-red-50 text-red-700 border-red-200 animate-pulse" :
      hours < 24 ? "bg-amber-50 text-amber-700 border-amber-200" :
                   "bg-gray-50 text-gray-600 border-gray-200"
    }`}>
      <Clock className="h-3 w-3" />
      {h}h {m > 0 ? `${m}m` : ""}
    </span>
  );
}

/* ─── Sections ────────────────────────────────────────────── */

function AvailableRFQsSection({ rfqs }: { rfqs: LogisticsRFQ[] }) {
  return (
    <section>
      <SectionHeader title="RFQs logísticos disponibles" href="/dashboard/forwarder/rfqs" />
      {rfqs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          message="No hay RFQs disponibles en este momento. Vuelve pronto o activa notificaciones."
          action="Ir a RFQs disponibles"
          actionHref="/dashboard/forwarder/rfqs"
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {rfqs.map((rfq) => {
            const cargo = CARGO_INFO[rfq.cargo_type] ?? CARGO_INFO.LCL;
            const CargoIcon = cargo.icon;
            const hl = hoursLeft(rfq.created_at);
            return (
              <div key={rfq.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cargo.cls}`}>
                        <CargoIcon className="h-3 w-3" /> {cargo.label}
                      </span>
                      {rfq.incoterm && (
                        <span className="text-[10px] font-semibold text-[#6B7280] bg-gray-100 px-2 py-0.5 rounded-full">
                          {rfq.incoterm}
                        </span>
                      )}
                      {rfq.include_insurance && (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          + Seguro
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm font-bold text-[#085041]">
                      <MapPin className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
                      <span className="truncate">{rfq.origin_port}</span>
                      <span className="text-[#6B7280] font-normal">→</span>
                      <span className="truncate">{rfq.destination_port}</span>
                    </div>
                  </div>
                  <CountdownBadge hours={hl} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-[#6B7280] mb-0.5">Producto</p>
                    <p className="font-semibold text-[#1E293B] truncate">{rfq.product_type ?? "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-[#6B7280] mb-0.5">Peso</p>
                    <p className="font-semibold text-[#1E293B]">{rfq.weight_kg ? `${rfq.weight_kg.toLocaleString()} kg` : "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-[#6B7280] mb-0.5">Fecha</p>
                    <p className="font-semibold text-[#1E293B] truncate">
                      {rfq.cargo_date ? new Date(rfq.cargo_date).toLocaleDateString("es-PE", { day: "numeric", month: "short" }) : "—"}
                    </p>
                  </div>
                </div>

                <Link href="/dashboard/forwarder/rfqs"
                  className="block text-center py-2.5 px-4 rounded-xl bg-[#1D9E75] text-white text-sm font-bold hover:bg-[#085041] transition-colors">
                  Cotizar ahora
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MyQuotesSection({ quotes }: { quotes: MyQuote[] }) {
  return (
    <section className="pb-6">
      <SectionHeader title="Mis cotizaciones enviadas" href="/dashboard/forwarder/cotizaciones" />
      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          message="Aún no has enviado cotizaciones. Revisa los RFQs disponibles y empieza a cotizar."
          action="Ver RFQs disponibles"
          actionHref="/dashboard/forwarder/rfqs"
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Ruta", "Tipo carga", "Precio ofertado", "Estado", "Enviada", ""].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.map((q) => {
                const st = QUOTE_STATUS[q.status] ?? QUOTE_STATUS.pendiente;
                const rfq = q.rfq_logistics;
                const cargo = rfq ? (CARGO_INFO[rfq.cargo_type] ?? CARGO_INFO.LCL) : CARGO_INFO.LCL;
                const CargoIcon = cargo.icon;
                return (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[#1E293B] whitespace-nowrap">
                      {rfq ? `${rfq.origin_port} → ${rfq.destination_port}` : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cargo.cls}`}>
                        <CargoIcon className="h-3 w-3" /> {cargo.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-[#085041]">USD {q.total_price_usd.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>
                        <st.icon className="h-3 w-3" /> {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#6B7280]">{timeAgo(q.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <Link href="/dashboard/forwarder/cotizaciones"
                        className="text-xs font-semibold text-[#1D9E75] hover:text-[#085041] transition-colors whitespace-nowrap">
                        Ver detalle →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function ForwarderDashboard() {
  const [userName, setUserName] = useState("");
  const [rfqs, setRfqs]         = useState<LogisticsRFQ[]>([]);
  const [quotes, setQuotes]     = useState<MyQuote[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserName(user.user_metadata?.full_name?.split(" ")[0] ?? "");

      const [rfqsRes, quotesRes] = await Promise.all([
        supabase.from("rfq_logistics")
          .select("id, origin_port, destination_port, cargo_type, product_type, weight_kg, cargo_date, incoterm, include_insurance, status, created_at")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase.from("logistics_quotes")
          .select("id, rfq_id, total_price_usd, carrier, status, created_at, rfq_logistics(origin_port, destination_port, cargo_type)")
          .eq("forwarder_id", user.id)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      setRfqs(rfqsRes.data ?? []);
      // Supabase returns joined rows as arrays; normalize to single object
      setQuotes(
        (quotesRes.data ?? []).map((q) => ({
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  const urgentRfqs    = rfqs.filter((r) => hoursLeft(r.created_at) < 12).length;
  const pendingQuotes = quotes.filter((q) => q.status === "pending").length;
  const acceptedQuotes = quotes.filter((q) => q.status === "accepted").length;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">
            {getGreeting()}{userName ? `, ${userName}` : ""} 👋
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Panel de Freight Forwarder · MARKARU</p>
        </div>
        <Link href="/dashboard/forwarder/rfqs"
          className="inline-flex items-center gap-2 bg-[#085041] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1D9E75] transition-colors shadow-sm">
          <FileText className="h-4 w-4" /> Ver RFQs disponibles
        </Link>
      </div>

      {/* Métricas */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="RFQs disponibles" value={String(rfqs.length)}
            sub={urgentRfqs > 0 ? `${urgentRfqs} urgentes` : "Sin urgentes"}
            icon={ClipboardList} accent="bg-blue-50 text-blue-600"
          />
          <MetricCard
            label="Cotizaciones enviadas" value={String(quotes.length)}
            sub={pendingQuotes > 0 ? `${pendingQuotes} pendientes` : "Sin pendientes"}
            icon={FileText} accent="bg-amber-50 text-amber-600"
          />
          <MetricCard
            label="Cotizaciones aceptadas" value={String(acceptedQuotes)}
            sub={acceptedQuotes > 0 ? "Operaciones confirmadas" : "Sigue cotizando"}
            icon={TrendingUp} accent="bg-[#E1F5EE] text-[#1D9E75]"
          />
          <MetricCard
            label="Tasa de aceptación"
            value={quotes.length > 0 ? `${Math.round((acceptedQuotes / quotes.length) * 100)}%` : "—"}
            sub={quotes.length > 0 ? `${acceptedQuotes} de ${quotes.length} cotizaciones` : "Sin datos aún"}
            icon={DollarSign} accent="bg-green-50 text-green-600"
          />
        </div>
      </section>

      <AvailableRFQsSection rfqs={rfqs} />
      <MyQuotesSection quotes={quotes} />
    </div>
  );
}

