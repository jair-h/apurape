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

interface RecentOp {
  id: string;
  product: string | null;
  origin_port: string | null;
  destination_country: string | null;
  status: string;
  fee_amount_usd: number | null;
  created_at: string;
  buyer_id: string | null;
  seller_id: string | null;
  buyerName?: string;
  sellerName?: string;
}

/* ─── Constants ───────────────────────────────────────────── */

const ROLE_LABELS: Record<string, string> = {
  productor: "Productor", exportador: "Exportador",
  forwarder: "Forwarder", certificadora: "Certificadora", comprador: "Comprador",
};

const INCOME_SOURCES = [
  { label: "Fees logísticos",  amount: 8240, pct: 50 },
  { label: "Membresías",       amount: 4200, pct: 26 },
  { label: "Gestión asistida", amount: 2800, pct: 17 },
  { label: "Certificaciones",  amount: 1100, pct:  7 },
];
const INCOME_COLORS = ["bg-[#1D9E75]", "bg-[#0C447C]", "bg-amber-500", "bg-purple-500"];

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
            <CheckCircle2 className="h-8 w-8 text-[#1D9E75] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#085041]">Cola vacía</p>
            <p className="text-xs text-[#6B7280] mt-1">No hay usuarios esperando verificación.</p>
          </div>
        )}

        {pending.map((u) => {
          const displayName = u.business_name ?? u.name ?? "Usuario";
          const initial     = displayName.charAt(0).toUpperCase();
          return (
            <div key={u.user_id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-[#085041] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-[#1E293B]">{displayName}</p>
                  <span className="text-[10px] font-bold bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full">
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1D9E75] text-white text-xs font-bold hover:bg-[#085041] transition-colors disabled:opacity-50">
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
                approved ? "bg-[#1D9E75]" : "bg-red-500"
              }`}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm text-[#1E293B] flex-1">
                <span className="font-semibold">{displayName}</span>
                {" · "}{ROLE_LABELS[u.role] ?? u.role}
              </p>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                approved ? "bg-[#1D9E75] text-white" : "bg-red-500 text-white"
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

function IncomeSection() {
  const total = INCOME_SOURCES.reduce((s, i) => s + i.amount, 0);
  return (
    <section>
      <SectionHeader title="Ingresos por fuente" href="/dashboard/admin/cobros" />
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Total del mes</p>
            <p className="text-3xl font-extrabold text-[#085041]">USD {total.toLocaleString()}</p>
          </div>
          <span className="text-xs font-semibold text-[#1D9E75] bg-[#E1F5EE] px-3 py-1.5 rounded-full">
            +18% vs mes anterior
          </span>
        </div>
        {INCOME_SOURCES.map((src, i) => (
          <div key={src.label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${INCOME_COLORS[i]}`} />
                <span className="text-sm font-medium text-[#1E293B]">{src.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#6B7280]">{src.pct}%</span>
                <span className="text-sm font-bold text-[#085041]">USD {src.amount.toLocaleString()}</span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${INCOME_COLORS[i]} rounded-full`} style={{ width: `${src.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Recent operations ───────────────────────────────────── */

const OP_STATUS_UI: Record<string, { label: string; dot: string; cls: string }> = {
  confirmed: { label: "Activa",  dot: "bg-[#1D9E75]", cls: "bg-[#E1F5EE] text-[#085041]" },
  active:    { label: "Activa",  dot: "bg-[#1D9E75]", cls: "bg-[#E1F5EE] text-[#085041]" },
  closed:    { label: "Cerrada", dot: "bg-gray-400",  cls: "bg-gray-100 text-gray-500" },
  cancelled: { label: "Cerrada", dot: "bg-gray-400",  cls: "bg-gray-100 text-gray-500" },
};

function OperationsSection({ ops }: { ops: RecentOp[] }) {
  if (ops.length === 0) {
    return (
      <section>
        <SectionHeader title="Operaciones recientes" href="/dashboard/admin/operaciones" />
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#085041]">Sin operaciones</p>
        </div>
      </section>
    );
  }
  return (
    <section>
      <SectionHeader title="Operaciones recientes" href="/dashboard/admin/operaciones" />
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Producto", "Vendedor → Comprador", "Ruta", "Estado", "Fee", ""].map((h) => (
                <th key={h} className="text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ops.map((op) => {
              const st = OP_STATUS_UI[op.status] ?? OP_STATUS_UI.confirmed;
              return (
                <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-[#1E293B]">{op.product ?? "—"}</td>
                  <td className="px-5 py-3.5 text-[#6B7280] text-xs truncate max-w-[180px]">
                    {[op.sellerName, op.buyerName].filter(Boolean).join(" → ") || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                      <MapPin className="h-3 w-3" />
                      {op.origin_port ?? "—"} → {op.destination_country ?? "—"}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-[#1D9E75]">
                    {op.fee_amount_usd ? `USD ${op.fee_amount_usd}` : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href="/dashboard/admin/operaciones"
                      className="text-xs font-semibold text-[#1D9E75] hover:text-[#085041] transition-colors">
                      Ver →
                    </Link>
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
  const [recentOps, setRecentOps]       = useState<RecentOp[]>([]);
  const [totalUsers, setTotalUsers]     = useState(0);
  const [activeOpsCount, setActiveOpsCount] = useState(0);
  const [totalProducts, setTotalProducts]   = useState(0);
  const [pendingReclamaciones, setPendingReclamaciones] = useState(0);
  const [decisions, setDecisions]       = useState<Record<string, "approved" | "rejected">>({});
  const [loadingId, setLoadingId]       = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [pendingRes, opsRes, totalRes, activeRes, productsRes, reclamRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, name, business_name, role, country, created_at")
          .eq("verified", false)
          .neq("role", "admin")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("operations")
          .select("id, product, origin_port, destination_country, status, fee_amount_usd, created_at, buyer_id, seller_id")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("operations").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("reclamaciones").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
      ]);

      const rawOps = opsRes.data ?? [];
      const allIds = [...new Set([
        ...rawOps.map((o) => o.buyer_id),
        ...rawOps.map((o) => o.seller_id),
      ].filter(Boolean) as string[])];

      const profileMap: Record<string, string> = {};
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, business_name")
          .in("user_id", allIds);
        for (const p of (profiles ?? [])) {
          profileMap[p.user_id] = (p.business_name as string | null) ?? (p.name as string | null) ?? "—";
        }
      }

      setPendingUsers(pendingRes.data ?? []);
      setRecentOps(rawOps.map((o) => ({
        ...o,
        buyerName:  o.buyer_id  ? profileMap[o.buyer_id]  : undefined,
        sellerName: o.seller_id ? profileMap[o.seller_id] : undefined,
      })));
      setTotalUsers(totalRes.count ?? 0);
      setActiveOpsCount(activeRes.count ?? 0);
      setTotalProducts(productsRes.count ?? 0);
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
      .eq("user_id", userId);
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
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-[#0D2B1F] p-1 rounded-lg">
              <Leaf className="h-4 w-4 text-[#1D9E75]" />
            </div>
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Panel de administración
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Centro de control</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Vista global de MARKARU</p>
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
            label="Productos publicados" value={totalProducts.toLocaleString()}
            sub="Catálogo activo"
            icon={Package} accent="bg-[#E1F5EE] text-[#1D9E75]"
          />
          <MetricCard
            label="Operaciones activas" value={String(activeOpsCount)}
            sub="Estado: confirmed"
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
          <IncomeSection />
        </div>
      </div>

      <OperationsSection ops={recentOps} />
    </div>
  );
}

