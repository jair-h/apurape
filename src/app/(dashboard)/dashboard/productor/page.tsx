"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck, Award, ClipboardList, TrendingUp, ArrowRight,
  Loader2, AlertCircle,
  Sprout, CheckCircle2, Shield, Inbox, PackageOpen,
  ShieldCheck,
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
  if (d === 1) return "Hace 1 día";
  return `Hace ${d} días`;
}

function certStatus(expiresAt: string): { label: string; status: "active" | "expiring" | "expired"; daysLeft: number } {
  const days = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return { status: "expired",  label: "Vencida",       daysLeft: days };
  if (days < 60) return { status: "expiring", label: "Vence pronto",  daysLeft: days };
  return            { status: "active",   label: "Activa",        daysLeft: days };
}

/* ─── Types ───────────────────────────────────────────────── */

type RFQ = {
  id: string;
  product: string;
  volume_tm: number;
  incoterm: string;
  destination_country: string;
  status: string;
  created_at: string;
};

type Operation = {
  id: string;
  operation_number: number;
  product: string;
  status: string;
  destination_country: string | null;
};

type Cert = {
  id: string;
  name: string;
  issuer: string;
  expires_at: string;
};

/* ─── Constants ───────────────────────────────────────────── */

const RFQ_STATUS: Record<string, { label: string; cls: string }> = {
  open:        { label: "Abierta",     cls: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "En progreso", cls: "bg-[#E1F5EE] text-[#1D9E75] border-green-200" },
  closed:      { label: "Cerrada",     cls: "bg-gray-100 text-gray-500 border-gray-200" },
  cancelled:   { label: "Cancelada",   cls: "bg-red-50 text-red-600 border-red-200" },
};

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

const CERT_STYLE: Record<"active" | "expiring" | "expired", { cls: string; icon: React.ElementType }> = {
  active:   { cls: "bg-[#E1F5EE] text-[#085041] border-green-300", icon: CheckCircle2 },
  expiring: { cls: "bg-amber-50 text-amber-700 border-amber-300",  icon: AlertCircle },
  expired:  { cls: "bg-red-50 text-red-700 border-red-300",        icon: AlertCircle },
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

function SectionHeader({ title, href, linkText }: { title: string; href?: string; linkText?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-[#085041]">{title}</h2>
      {href && (
        <Link href={href} className="text-xs font-semibold text-[#1D9E75] hover:text-[#085041] flex items-center gap-1 transition-colors">
          {linkText ?? "Ver todo"} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, message, action, actionHref }: {
  icon: React.ElementType;
  message: string;
  action?: string;
  actionHref?: string;
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

function RFQsSection({ rfqs }: { rfqs: RFQ[] }) {
  return (
    <section>
      <SectionHeader title="RFQs disponibles" href="/dashboard/productor/rfqs" />
      {rfqs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          message="Aún no hay RFQs disponibles. Completa tu perfil para aparecer en el directorio."
          action="Completar perfil"
          actionHref="/dashboard/productor/perfil"
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Producto", "Volumen (TM)", "Incoterm", "Destino", "Estado", "Publicado", ""].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rfqs.map((rfq) => {
                const st = RFQ_STATUS[rfq.status] ?? RFQ_STATUS.activo;
                return (
                  <tr key={rfq.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[#1E293B]">{rfq.product}</td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{rfq.volume_tm} TM</td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{rfq.incoterm}</td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{rfq.destination_country}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[#6B7280] text-xs">{timeAgo(rfq.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <Link href="/dashboard/productor/rfqs"
                        className="text-xs font-semibold text-[#1D9E75] hover:text-[#085041] transition-colors">
                        Responder →
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
      <SectionHeader title="Operaciones en curso" href="/dashboard/productor/operaciones" />
      {ops.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          message="Aún no tienes operaciones activas. Responde un RFQ para iniciar una exportación."
          action="Ver RFQs disponibles"
          actionHref="/dashboard/productor/rfqs"
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

function CertificationsSection({ certs }: { certs: Cert[] }) {
  return (
    <section className="pb-6">
      <SectionHeader title="Mis certificaciones" href="/dashboard/certificaciones" linkText="Gestionar" />
      {certs.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          message="Aún no tienes certificaciones registradas. Agrégalas para aumentar tu visibilidad."
          action="Agregar certificación"
          actionHref="/dashboard/certificaciones"
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {certs.map((cert, i) => {
            const { status, label, daysLeft } = certStatus(cert.expires_at);
            const style = CERT_STYLE[status];
            const Icon = style.icon;
            return (
              <div key={cert.id}
                className={`flex items-center gap-4 px-5 py-4 ${i < certs.length - 1 ? "border-b border-gray-100" : ""}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${style.cls} border`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1E293B]">{cert.name}</p>
                  <p className="text-xs text-[#6B7280]">
                    {cert.issuer} · Vence: {new Date(cert.expires_at).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${style.cls}`}>{label}</span>
                {status === "expiring" && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    {daysLeft}d restantes
                  </span>
                )}
                {status === "expired" && (
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    Vencida hace {Math.abs(daysLeft)}d
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function QuickActions() {
  const actions = [
    { icon: Truck,  title: "Cotizar flete",        desc: "Solicita cotizaciones logísticas en 48h", href: "/dashboard/logistica/cotizar", primary: true },
    { icon: Shield, title: "Solicitar certificación", desc: "Certifica tu producción",             href: "/dashboard/certificaciones",    primary: false },
    { icon: Award,  title: "Cursos disponibles",   desc: "Formación para exportar mejor",           href: "/dashboard/cursos",             primary: false },
  ] as const;

  return (
    <section>
      <SectionHeader title="Acciones rápidas" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {actions.map((a) => (
          <Link key={a.title} href={a.href}
            className={`group flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md hover:-translate-y-0.5 ${
              a.primary ? "bg-[#085041] border-[#085041] text-white" : "bg-white border-gray-200 hover:border-[#1D9E75]"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${a.primary ? "bg-[#1D9E75]" : "bg-[#E1F5EE]"}`}>
              <a.icon className={`h-5 w-5 ${a.primary ? "text-white" : "text-[#1D9E75]"}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold ${a.primary ? "text-white" : "text-[#085041]"}`}>{a.title}</p>
              <p className={`text-xs mt-0.5 ${a.primary ? "text-green-200" : "text-[#6B7280]"}`}>{a.desc}</p>
            </div>
            <ArrowRight className={`h-4 w-4 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${a.primary ? "text-green-300" : "text-[#1D9E75]"}`} />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function ProductorDashboard() {
  const [userName, setUserName]   = useState("");
  const [plan, setPlan]           = useState("free");
  const [rfqs, setRfqs]           = useState<RFQ[]>([]);
  const [operations, setOps]      = useState<Operation[]>([]);
  const [certs, setCerts]         = useState<Cert[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserName(user.user_metadata?.full_name?.split(" ")[0] ?? "");

      const [profileRes, rfqsRes, opsRes, certsRes] = await Promise.all([
        supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
        supabase.from("rfq_commercial")
          .select("id, product, volume_tm, incoterm, destination_country, status, created_at")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase.from("operations")
          .select("id, operation_number, product, status, destination_country")
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .neq("status", "closed")
          .limit(2),
        supabase.from("certifications")
          .select("id, name, issuer, expires_at")
          .eq("user_id", user.id)
          .order("expires_at", { ascending: true })
          .limit(3),
      ]);

      setPlan(profileRes.data?.plan ?? "free");
      setRfqs(rfqsRes.data ?? []);
      setOps(opsRes.data ?? []);
      setCerts(certsRes.data ?? []);
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

  const planLabel = { free: "Gratis", basic: "Básico", pro: "Pro" }[plan] ?? plan;
  const expiringSoon = certs.filter((c) => certStatus(c.expires_at).status === "expiring").length;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold text-[#1D9E75] uppercase tracking-wider mb-0.5">Plan {planLabel}</p>
          <h1 className="text-2xl font-extrabold text-[#085041]">
            {getGreeting()}{userName ? `, ${userName}` : ""} 👋
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Aquí tienes el resumen de tu operación agroexportadora.</p>
        </div>
        {plan === "free" && (
          <Link href="/dashboard/plan"
            className="flex items-center gap-2 bg-[#085041] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1D9E75] transition-colors shadow-sm">
            <Sprout className="h-4 w-4" />
            Actualizar a Productor Pro
          </Link>
        )}
      </div>

      {/* Métricas */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="RFQs disponibles" value={String(rfqs.length)}
            sub={rfqs.length === 0 ? "Sin solicitudes hoy" : `${rfqs.length} sin responder`}
            icon={ClipboardList} accent="bg-blue-50 text-blue-600"
          />
          <MetricCard
            label="Operaciones activas" value={String(operations.length)}
            sub={operations.length === 0 ? "Sin operaciones" : "En curso"}
            icon={TrendingUp} accent="bg-[#E1F5EE] text-[#1D9E75]"
          />
          <MetricCard
            label="Certificaciones" value={String(certs.length)}
            sub={expiringSoon > 0 ? `${expiringSoon} por vencer` : "Al día"}
            icon={AlertCircle} accent="bg-amber-50 text-amber-600"
          />
          <MetricCard
            label="Plan actual" value={planLabel}
            sub={plan === "free" ? "Mejora tu visibilidad" : "Activo"}
            icon={Award} accent="bg-purple-50 text-purple-600"
          />
        </div>
      </section>

      <RFQsSection rfqs={rfqs} />
      <QuickActions />
      <OperationsSection ops={operations} />
      <CertificationsSection certs={certs} />
    </div>
  );
}
