"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck, ClipboardList, TrendingUp, ArrowRight,
  Loader2, Plus, CheckCircle2,
  Inbox, PackageOpen, Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Helpers ─────────────────────────────────────────────── */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Hace menos de 1h";
  if (h < 24) return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d}d`;
  return `Hace ${Math.floor(d / 7)} sem.`;
}

/* ─── Types ───────────────────────────────────────────────── */

type MyRFQ = {
  id: string;
  product: string;
  volume_tm: number;
  status: string;
  created_at: string;
  destination_country: string;
  ref_price_usd: number | null;
};

type Operation = {
  id: string;
  operation_number: number;
  product: string;
  status: string;
  destination_country: string | null;
  delivery_date: string | null;
};

/* ─── Constants ───────────────────────────────────────────── */


const OP_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  confirmed:     { label: "Confirmada",    cls: "bg-blue-50 text-blue-700",     dot: "bg-blue-400" },
  harvest_ready: { label: "Cosecha lista", cls: "bg-amber-50 text-amber-700",   dot: "bg-amber-400" },
  inspected:     { label: "Inspeccionada", cls: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-400" },
  packed:        { label: "Empacada",      cls: "bg-orange-50 text-orange-700", dot: "bg-orange-400" },
  gate_in:       { label: "En puerto",     cls: "bg-purple-50 text-purple-700", dot: "bg-purple-400" },
  departed:      { label: "Embarcado",     cls: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-400" },
  in_transit:    { label: "En tránsito",   cls: "bg-sky-50 text-sky-700",       dot: "bg-sky-400" },
  arrived:       { label: "En destino",    cls: "bg-[#E1F5EE] text-[#1D9E75]", dot: "bg-[#1D9E75]" },
  closed:        { label: "Cerrada",       cls: "bg-gray-100 text-gray-500",    dot: "bg-gray-400" },
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

function SectionHeader({ title, href, action }: {
  title: string; href?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-[#085041]">{title}</h2>
      <div className="flex items-center gap-3">
        {href && (
          <Link href={href} className="text-xs font-semibold text-[#1D9E75] hover:text-[#085041] flex items-center gap-1 transition-colors">
            Ver todo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
        {action}
      </div>
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

/* ─── Sections ────────────────────────────────────────────── */

const RFQ_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open:        { label: "Abierta",     cls: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "En progreso", cls: "bg-[#E1F5EE] text-[#085041] border-green-200" },
  closed:      { label: "Cerrada",     cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

function MyRFQsSection({ rfqs }: { rfqs: MyRFQ[] }) {
  return (
    <section>
      <SectionHeader
        title="Mis solicitudes de compra"
        href="/dashboard/exportador/solicitudes"
        action={
          <Link
            href="/dashboard/exportador/rfq/nuevo"
            className="inline-flex items-center gap-1.5 bg-[#1D9E75] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#085041] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Publicar solicitud
          </Link>
        }
      />
      {rfqs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          message="Aún no has publicado solicitudes de compra. Los productores te enviarán sus ofertas."
          action="Publicar primera solicitud"
          actionHref="/dashboard/exportador/rfq/nuevo"
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Producto", "Volumen (TM)", "Destino", "Estado", "Publicado", ""].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rfqs.map((rfq) => {
                const st = RFQ_STATUS_MAP[rfq.status] ?? RFQ_STATUS_MAP.open;
                return (
                  <tr key={rfq.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-[#1E293B]">{rfq.product}</td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{rfq.volume_tm} TM</td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{rfq.destination_country}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>
                        <CheckCircle2 className="h-3 w-3" /> {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#6B7280]">{timeAgo(rfq.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <Link href="/dashboard/exportador/solicitudes"
                        className="text-xs font-semibold text-[#1D9E75] hover:text-[#085041] transition-colors">
                        Ver ofertas →
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

function OperationsSection({ ops }: { ops: Operation[] }) {
  return (
    <section>
      <SectionHeader title="Operaciones activas" href="/dashboard/exportador/operaciones" />
      {ops.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          message="Aún no tienes operaciones activas. Inicia contactando productores o publicando un RFQ."
          action="Buscar productores"
          actionHref="/dashboard/exportador/productores"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ops.map((op) => {
            const st = OP_STATUS[op.status] ?? OP_STATUS.confirmed;
            return (
              <div key={op.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[10px] font-bold text-[#6B7280]">#{op.operation_number}</p>
                    <p className="text-sm font-bold text-[#085041]">{op.product}</p>
                    {op.destination_country && <p className="text-xs text-[#6B7280] mt-0.5">{op.destination_country}</p>}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                </div>
                <Link href={`/dashboard/operacion/${op.id}`}
                  className="text-xs font-semibold text-[#1D9E75] hover:text-[#085041] transition-colors">
                  Ver detalle →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProducerCTASection() {
  return (
    <section className="pb-6">
      <SectionHeader title="Buscar productores" href="/dashboard/exportador/productores" />
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex items-center gap-6">
        <div className="w-12 h-12 rounded-xl bg-[#E1F5EE] flex items-center justify-center flex-shrink-0">
          <Search className="h-6 w-6 text-[#1D9E75]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#085041]">Directorio de productores verificados</p>
          <p className="text-xs text-[#6B7280] mt-1">
            Busca productores por producto, región, certificación y volumen. Contáctalos directamente desde la plataforma.
          </p>
        </div>
        <Link
          href="/dashboard/exportador/productores"
          className="flex-shrink-0 inline-flex items-center gap-2 bg-[#085041] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1D9E75] transition-colors"
        >
          Explorar <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function ExportadorDashboard() {
  const [userName, setUserName] = useState("");
  const [rfqs, setRfqs]         = useState<MyRFQ[]>([]);
  const [ops, setOps]           = useState<Operation[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserName(user.user_metadata?.full_name?.split(" ")[0] ?? "");

      const [rfqsRes, opsRes] = await Promise.all([
        supabase.from("rfq_commercial")
          .select("id, product, volume_tm, status, created_at, destination_country, ref_price_usd")
          .eq("exporter_id", user.id)
          .order("created_at", { ascending: false })
          .limit(4),
        supabase.from("operations")
          .select("id, operation_number, product, status, destination_country, delivery_date")
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .neq("status", "closed")
          .limit(2),
      ]);

      setRfqs(rfqsRes.data ?? []);
      setOps(opsRes.data ?? []);
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

  const activeRfqs = rfqs.filter((r) => r.status === "open").length;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">
            {getGreeting()}{userName ? `, ${userName}` : ""} 👋
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Panel de exportador · MARKARU</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/logistica/cotizar"
            className="inline-flex items-center gap-2 bg-[#085041] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1D9E75] transition-colors shadow-sm">
            <Truck className="h-4 w-4" /> Cotizar flete
          </Link>
          <Link href="/dashboard/exportador/rfq/nuevo"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-[#085041] px-4 py-2.5 rounded-xl text-sm font-bold hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Publicar solicitud
          </Link>
        </div>
      </div>

      {/* Métricas */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Solicitudes publicadas" value={String(rfqs.length)}
            sub={activeRfqs > 0 ? `${activeRfqs} abiertas` : "Sin solicitudes abiertas"}
            icon={ClipboardList} accent="bg-blue-50 text-blue-600"
          />
          <MetricCard
            label="Operaciones activas" value={String(ops.length)}
            sub={ops.length === 0 ? "Sin operaciones" : `${ops.length} en curso`}
            icon={TrendingUp} accent="bg-[#E1F5EE] text-[#1D9E75]"
          />
          <MetricCard
            label="Flete" value="Cotizar"
            sub="Obtén cotizaciones en 48h"
            icon={Truck} accent="bg-amber-50 text-amber-600"
          />
          <MetricCard
            label="Productores" value="Buscar"
            sub="Directorio verificado"
            icon={Search} accent="bg-purple-50 text-purple-600"
          />
        </div>
      </section>

      <MyRFQsSection rfqs={rfqs} />
      <ProducerCTASection />
      <OperationsSection ops={ops} />
    </div>
  );
}

