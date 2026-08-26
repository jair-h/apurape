"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign, Users, TrendingUp, Shield,
  CheckCircle2, XCircle, ArrowRight, MapPin,
  Leaf, Loader2, Package, AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Types ───────────────────────────────────────────────── */

interface PendingUser {
  user_id: string;
  name: string | null;
  business_name: string | null;
  role: string;
  country: string | null;
  created_at: string;
}

interface RecentJob {
  id: string;
  title: string;
  amount: number;
  status: string;
  created_at: string;
  provider_id: string | null;
  client_id: string | null;
  providerName?: string;
  clientName?: string;
}

/* ─── Constants ───────────────────────────────────────────── */

const ROLE_LABELS: Record<string, string> = {
  proveedor: "Proveedor", cliente: "Cliente", admin: "Administrador",
};

/* ─── Sub-components ──────────────────────────────────────── */

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
        <p className="text-2xl font-extrabold text-[#B42318] leading-tight">{value}</p>
        <p className="text-xs text-[#6B7280] mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-[#B42318]">{title}</h2>
      {href && (
        <Link href={href} className="text-xs font-semibold text-[#D92D20] hover:text-[#B42318] flex items-center gap-1 transition-colors">
          Ver todo <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ─── Verification queue ──────────────────────────────────── */

function VerificationQueue({
  users, onApprove, onReject, loadingId, decisions,
}: {
  users: PendingUser[];
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  loadingId: string | null;
  decisions: Record<string, "approved" | "rejected">;
}) {
  const pending  = users.filter((u) => !decisions[u.user_id]);
  const resolved = users.filter((u) =>  decisions[u.user_id]);

  return (
    <section>
      <SectionHeader title="Cola de verificación" href="/dashboard/admin/verificacion" />
      <div className="space-y-3">
        {pending.length === 0 && resolved.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
            <CheckCircle2 className="h-8 w-8 text-[#D92D20] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#B42318]">Cola vacía</p>
            <p className="text-xs text-[#6B7280] mt-1">No hay usuarios esperando verificación.</p>
          </div>
        )}

        {pending.map((u) => {
          const displayName = u.business_name ?? u.name ?? "Usuario";
          const initial     = displayName.charAt(0).toUpperCase();
          return (
            <div key={u.user_id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-[#B42318] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-[#1E293B]">{displayName}</p>
                  <span className="text-[10px] font-bold bg-[#FEF3F2] text-[#B42318] px-2 py-0.5 rounded-full">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </div>
                {u.name && u.business_name && (
                  <p className="text-xs text-[#6B7280] mt-0.5">{u.name}</p>
                )}
                <p className="text-[10px] text-[#6B7280] mt-0.5">
                  {u.country ?? "—"} · Registrado {new Date(u.created_at).toLocaleDateString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button type="button"
                  onClick={() => onReject(u.user_id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors">
                  <XCircle className="h-3.5 w-3.5" /> Rechazar
                </button>
                <button type="button"
                  onClick={() => onApprove(u.user_id)}
                  disabled={loadingId === u.user_id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D92D20] text-white text-xs font-bold hover:bg-[#B42318] transition-colors disabled:opacity-50">
                  {loadingId === u.user_id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <><CheckCircle2 className="h-3.5 w-3.5" /> Aprobar</>}
                </button>
              </div>
            </div>
          );
        })}

        {resolved.map((u) => {
          const approved    = decisions[u.user_id] === "approved";
          const displayName = u.business_name ?? u.name ?? "Usuario";
          return (
            <div key={u.user_id} className={`rounded-2xl border p-4 flex items-center gap-3 opacity-70 ${
              approved ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                approved ? "bg-[#D92D20]" : "bg-red-500"
              }`}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm text-[#1E293B] flex-1">
                <span className="font-semibold">{displayName}</span>
                {" · "}{ROLE_LABELS[u.role] ?? u.role}
              </p>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                approved ? "bg-[#D92D20] text-white" : "bg-red-500 text-white"
              }`}>
                {approved ? "Aprobado" : "Rechazado"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Income by source ────────────────────────────────────── */

/* Ingresos reales de `payments`. Antes esto era una lista fija de cifras
 * inventadas en USD ("fees logísticos", "certificaciones"). En Apurape la
 * única fuente de ingresos es la suscripción Pro: 0% de comisión. */
function IncomeSection({ persona, negocio }: { persona: number; negocio: number }) {
  const total = persona + negocio;
  const rows = [
    { label: "Pro Persona · S/120", amount: persona, color: "bg-[#D92D20]" },
    { label: "Pro Negocio · S/330", amount: negocio, color: "bg-[#0E9384]" },
  ];

  return (
    <section>
      <SectionHeader title="Ingresos por plan" href="/dashboard/admin/cobros" />
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
        <div>
          <p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Cobrado en total</p>
          <p className="text-3xl font-extrabold text-[#B42318]">S/ {total.toLocaleString("es-PE")}</p>
          <p className="text-xs text-[#6B7280] mt-0.5">Comisión sobre ventas: 0%</p>
        </div>

        {total === 0 ? (
          <p className="text-xs text-[#6B7280]">Todavía no hay pagos registrados.</p>
        ) : (
          rows.map((r) => {
            const pct = Math.round((r.amount / total) * 100);
            return (
              <div key={r.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${r.color}`} />
                    <span className="text-sm font-medium text-[#1E293B]">{r.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#6B7280]">{pct}%</span>
                    <span className="text-sm font-bold text-[#B42318]">S/ {r.amount.toLocaleString("es-PE")}</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${r.color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

/* ─── Recent operations ───────────────────────────────────── */

const JOB_STATUS_UI: Record<string, { label: string; dot: string; cls: string }> = {
  agendado:            { label: "Agendado",     dot: "bg-blue-500",  cls: "bg-blue-50 text-blue-700" },
  pendiente_confirmar: { label: "Por confirmar",dot: "bg-amber-500", cls: "bg-amber-50 text-amber-700" },
  confirmado:          { label: "Confirmado",   dot: "bg-[#D92D20]", cls: "bg-[#FEF3F2] text-[#B42318]" },
  cancelado:           { label: "Cancelado",    dot: "bg-gray-400",  cls: "bg-gray-100 text-gray-500" },
  disputa:             { label: "En disputa",   dot: "bg-red-500",   cls: "bg-red-50 text-red-700" },
};

function JobsSection({ jobs }: { jobs: RecentJob[] }) {
  if (jobs.length === 0) {
    return (
      <section>
        <SectionHeader title="Trabajos recientes" href="/dashboard/admin/sorteos" />
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#B42318]">Sin trabajos todavía</p>
        </div>
      </section>
    );
  }
  return (
    <section>
      <SectionHeader title="Trabajos recientes" href="/dashboard/admin/sorteos" />
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Servicio", "Proveedor → Cliente", "Monto", "Estado", "Fecha"].map((h) => (
                <th key={h} className="text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((j) => {
              const st = JOB_STATUS_UI[j.status] ?? JOB_STATUS_UI.agendado;
              return (
                <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-[#1E293B]">{j.title}</td>
                  <td className="px-5 py-3.5 text-[#6B7280] text-xs truncate max-w-[200px]">
                    {[j.providerName, j.clientName].filter(Boolean).join(" → ") || "—"}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-[#B42318]">
                    S/ {Number(j.amount).toLocaleString("es-PE")}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#6B7280]">
                    {new Date(j.created_at).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function AdminDashboard() {
  const [loading, setLoading]           = useState(true);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [recentJobs, setRecentJobs]     = useState<RecentJob[]>([]);
  const [totalUsers, setTotalUsers]     = useState(0);
  const [confirmedJobs, setConfirmedJobs]   = useState(0);
  const [totalServices, setTotalServices]   = useState(0);
  const [pendingReclamaciones, setPendingReclamaciones] = useState(0);
  const [income, setIncome] = useState({ persona: 0, negocio: 0 });
  const [decisions, setDecisions]       = useState<Record<string, "approved" | "rejected">>({});
  const [loadingId, setLoadingId]       = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [pendingRes, jobsRes, totalRes, confirmedRes, servicesRes, reclamRes, paymentsRes] = await Promise.all([
        supabase
          .from("profiles")
          // profiles.id ES el id de auth; se alias a user_id para el resto de la pantalla.
          .select("user_id:id, name, business_name, role, country, created_at")
          .eq("verified", false)
          .neq("role", "admin")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("jobs")
          .select("id, title, amount, status, created_at, provider_id, client_id")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "confirmado"),
        supabase.from("provider_services").select("id", { count: "exact", head: true }).eq("status", "activo"),
        supabase.from("reclamaciones").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
        supabase.from("payments").select("amount_cents, account_type").eq("status", "pagado"),
      ]);

      const rawJobs = jobsRes.data ?? [];
      const allIds = [...new Set([
        ...rawJobs.map((j) => j.provider_id),
        ...rawJobs.map((j) => j.client_id),
      ].filter(Boolean) as string[])];

      const profileMap: Record<string, string> = {};
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id:id, name, business_name")
          .in("id", allIds);
        for (const p of (profiles ?? [])) {
          profileMap[p.user_id] = (p.business_name as string | null) ?? (p.name as string | null) ?? "—";
        }
      }

      // Los importes se guardan en céntimos de sol.
      const pagos = paymentsRes.data ?? [];
      setIncome({
        persona: pagos.filter((p) => p.account_type === "persona").reduce((s, p) => s + (p.amount_cents ?? 0), 0) / 100,
        negocio: pagos.filter((p) => p.account_type === "negocio").reduce((s, p) => s + (p.amount_cents ?? 0), 0) / 100,
      });

      setPendingUsers(pendingRes.data ?? []);
      setRecentJobs(rawJobs.map((j) => ({
        ...j,
        providerName: j.provider_id ? profileMap[j.provider_id] : undefined,
        clientName:   j.client_id   ? profileMap[j.client_id]   : undefined,
      })));
      setTotalUsers(totalRes.count ?? 0);
      setConfirmedJobs(confirmedRes.count ?? 0);
      setTotalServices(servicesRes.count ?? 0);
      setPendingReclamaciones(reclamRes.count ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  const handleApprove = useCallback(async (userId: string) => {
    setLoadingId(userId);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ verified: true })
      .eq("id", userId);
    if (error) console.error("[approve]", error);
    setDecisions((p) => ({ ...p, [userId]: "approved" }));
    setLoadingId(null);
  }, []);

  const handleReject = useCallback((userId: string) => {
    setDecisions((p) => ({ ...p, [userId]: "rejected" }));
  }, []);

  const pendingCount = pendingUsers.filter((u) => !decisions[u.user_id]).length;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#D92D20] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-[#7A271A] p-1 rounded-lg">
              <Leaf className="h-4 w-4 text-[#D92D20]" />
            </div>
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Panel de administración
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#B42318]">Centro de control</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Vista global de Apurape</p>
        </div>

        {pendingCount > 0 && (
          <Link
            href="/dashboard/admin/verificacion"
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm"
          >
            <Shield className="h-4 w-4" />
            {pendingCount} pendientes de verificación
          </Link>
        )}
      </div>

      {/* Métricas */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Usuarios registrados" value={totalUsers.toLocaleString()}
            sub="Total en la plataforma"
            icon={Users} accent="bg-blue-50 text-blue-600"
          />
          <MetricCard
            label="Servicios publicados" value={totalServices.toLocaleString()}
            sub="Activos en el catálogo"
            icon={Package} accent="bg-[#FEF3F2] text-[#D92D20]"
          />
          <MetricCard
            label="Servicios confirmados" value={String(confirmedJobs)}
            sub="Confirmados por el cliente"
            icon={TrendingUp} accent="bg-purple-50 text-purple-600"
          />
          <MetricCard
            label="Reclamaciones pendientes" value={String(pendingReclamaciones)}
            sub="Requieren atención"
            icon={AlertCircle} accent="bg-amber-50 text-amber-600"
          />
        </div>
      </section>

      {/* Cola + ingresos */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        <div className="xl:col-span-3">
          <VerificationQueue
            users={pendingUsers}
            onApprove={handleApprove}
            onReject={handleReject}
            loadingId={loadingId}
            decisions={decisions}
          />
        </div>
        <div className="xl:col-span-2">
          <IncomeSection persona={income.persona} negocio={income.negocio} />
        </div>
      </div>

      <JobsSection jobs={recentJobs} />
    </div>
  );
}

