"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search, Filter, CheckCircle2, XCircle, Eye,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Users, X, Loader2, ShieldCheck, Ban,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Types ───────────────────────────────────────────────── */
type RoleFilter  = "todos" | "productor" | "exportador" | "forwarder" | "certificadora" | "comprador" | "banco";

interface AppUser {
  id: string;
  user_id: string;
  name: string | null;
  business_name: string | null;
  role: string;
  plan: string | null;
  verified: boolean;
  suspended: boolean;
  country: string | null;
  created_at: string;
  email?: string;
}

const ROLE_LABELS: Record<string, string> = {
  productor: "Productor", exportador: "Exportador", forwarder: "Forwarder",
  certificadora: "Certificadora", comprador: "Comprador", banco: "Banco", admin: "Admin",
};
const ROLE_COLORS: Record<string, string> = {
  productor:    "bg-green-100 text-green-700",
  exportador:   "bg-blue-100 text-blue-700",
  forwarder:    "bg-purple-100 text-purple-700",
  certificadora:"bg-amber-100 text-amber-700",
  comprador:    "bg-pink-100 text-pink-700",
  banco:        "bg-gray-100 text-gray-700",
  admin:        "bg-red-100 text-red-700",
};

const PAGE_SIZE = 20;

/* ─── Page ────────────────────────────────────────────────── */
export default function UsuariosPage() {
  const [users, setUsers]           = useState<AppUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage]             = useState(0);
  const [sortField, setSortField]   = useState<"created_at">("created_at");
  const [sortAsc, setSortAsc]       = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ user: AppUser; action: "verify" | "suspend" | "unsuspend" } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, name, business_name, role, plan, verified, suspended, country, created_at")
        .order("created_at", { ascending: false });
      if (error) console.error("[usuarios]", error);
      const profiles: AppUser[] = (data ?? []).map((p) => ({ ...p, suspended: p.suspended ?? false }));

      // Fetch emails via admin RPC
      const ids = profiles.map((p) => p.user_id);
      if (ids.length > 0) {
        const { data: emailRows } = await supabase.rpc("admin_get_user_emails", { user_ids: ids });
        const emailMap: Record<string, string> = {};
        for (const row of (emailRows ?? [])) emailMap[row.user_id] = row.email;
        profiles.forEach((p) => { p.email = emailMap[p.user_id] ?? "—"; });
      }
      setUsers(profiles);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users
      .filter((u) => {
        const name = (u.business_name ?? u.name ?? "").toLowerCase();
        const email = (u.email ?? "").toLowerCase();
        const matchSearch = !search || name.includes(q) || email.includes(q);
        const matchRole   = roleFilter === "todos" || u.role === roleFilter;
        return matchSearch && matchRole;
      })
      .sort((a, b) => {
        const av = new Date(a.created_at).getTime();
        const bv = new Date(b.created_at).getTime();
        return sortAsc ? av - bv : bv - av;
      });
  }, [users, search, roleFilter, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleVerify = async (u: AppUser) => {
    setActionLoading(u.user_id);
    const supabase = createClient();
    await supabase.from("profiles").update({ verified: true }).eq("user_id", u.user_id);
    setUsers((prev) => prev.map((x) => x.user_id === u.user_id ? { ...x, verified: true } : x));
    setActionLoading(null);
    setConfirmModal(null);
  };

  const handleSuspend = async (u: AppUser, suspend: boolean) => {
    setActionLoading(u.user_id);
    const supabase = createClient();
    await supabase.from("profiles").update({ suspended: suspend }).eq("user_id", u.user_id);
    setUsers((prev) => prev.map((x) => x.user_id === u.user_id ? { ...x, suspended: suspend } : x));
    setActionLoading(null);
    setConfirmModal(null);
  };

  const selectCls = "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-[#1E293B] focus:outline-none focus:border-[#1D9E75] transition-all";

  if (loading) return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
    </div>
  );

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Usuarios registrados</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Gestión completa de todos los usuarios de la plataforma.</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total",       value: users.length,                            cls: "text-[#085041]" },
            { label: "Verificados", value: users.filter((u) => u.verified).length,  cls: "text-[#1D9E75]" },
            { label: "Suspendidos", value: users.filter((u) => u.suspended).length, cls: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-3 py-3 shadow-sm text-center">
              <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Buscar por nombre o email..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all" />
            </div>
            <button type="button" onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                showFilters ? "bg-[#085041] text-white border-[#085041]" : "bg-white border-gray-200 text-[#6B7280] hover:border-[#1D9E75]"
              }`}>
              <Filter className="h-4 w-4" /> Filtros
            </button>
          </div>
          {showFilters && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-2 gap-3 shadow-sm">
              <div>
                <label className="block text-[10px] font-bold text-[#085041] mb-1.5 uppercase tracking-wider">Rol</label>
                <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as RoleFilter); setPage(0); }} className={selectCls}>
                  <option value="todos">Todos</option>
                  {["productor","exportador","forwarder","certificadora","comprador","banco"].map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => { setSearch(""); setRoleFilter("todos"); setPage(0); }}
                  className="text-xs text-[#6B7280] hover:text-red-500 transition-colors">
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-[#6B7280]">
          Mostrando <span className="font-bold text-[#085041]">{filtered.length}</span> de {users.length} usuarios
        </p>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    { label: "Nombre" },
                    { label: "Email" },
                    { label: "Rol" },
                    { label: "País" },
                    { label: "Plan" },
                    { label: "Registro", sort: true },
                    { label: "Estado" },
                    { label: "Acciones" },
                  ].map((h, i) => (
                    <th key={i}
                      onClick={() => h.sort && (setSortAsc(!sortAsc))}
                      className={`text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider px-4 py-3 ${h.sort ? "cursor-pointer hover:text-[#085041] select-none" : ""}`}>
                      {h.label}
                      {h.sort && (sortAsc ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center">
                    <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#085041]">Sin resultados</p>
                  </td></tr>
                ) : paginated.map((u) => {
                  const isLoading = actionLoading === u.user_id;
                  return (
                    <tr key={u.user_id} className={`hover:bg-gray-50 transition-colors ${u.suspended ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3 font-semibold text-[#1E293B] max-w-[140px] truncate">
                        {u.business_name ?? u.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] max-w-[160px] truncate">{u.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">{u.country ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {u.plan ?? "free"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {new Date(u.created_at).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        {u.suspended
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600"><Ban className="h-3 w-3" /> Suspendido</span>
                          : u.verified
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E1F5EE] text-[#085041]"><CheckCircle2 className="h-3 w-3" /> Verificado</span>
                          : <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><XCircle className="h-3 w-3" /> Pendiente</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/perfil/${u.user_id}`} target="_blank"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-[#6B7280] border border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-all bg-white">
                            <Eye className="h-3 w-3" /> Ver
                          </Link>
                          {!u.verified && !u.suspended && (
                            <button type="button"
                              disabled={isLoading}
                              onClick={() => setConfirmModal({ user: u, action: "verify" })}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-[#1D9E75] border border-[#1D9E75] hover:bg-[#E1F5EE] transition-all bg-white disabled:opacity-50">
                              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />} Verificar
                            </button>
                          )}
                          {!u.suspended ? (
                            <button type="button"
                              disabled={isLoading}
                              onClick={() => setConfirmModal({ user: u, action: "suspend" })}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-red-500 border border-red-200 hover:bg-red-50 transition-all bg-white disabled:opacity-50">
                              <Ban className="h-3 w-3" /> Suspender
                            </button>
                          ) : (
                            <button type="button"
                              disabled={isLoading}
                              onClick={() => setConfirmModal({ user: u, action: "unsuspend" })}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-[#1D9E75] border border-[#1D9E75] hover:bg-[#E1F5EE] transition-all bg-white disabled:opacity-50">
                              <CheckCircle2 className="h-3 w-3" /> Reactivar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-[#6B7280]">
                Página <span className="font-bold">{page + 1}</span> de {totalPages}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-200 text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75] disabled:opacity-40 transition-all">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75] disabled:opacity-40 transition-all">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-[#085041]">
                {confirmModal.action === "verify" ? "Verificar usuario"
                  : confirmModal.action === "suspend" ? "Suspender cuenta"
                  : "Reactivar cuenta"}
              </h3>
              <button type="button" onClick={() => setConfirmModal(null)}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[#6B7280]">
                {confirmModal.action === "verify"
                  ? `¿Dar el sello verificado a ${confirmModal.user.business_name ?? confirmModal.user.name}?`
                  : confirmModal.action === "suspend"
                  ? `¿Suspender la cuenta de ${confirmModal.user.business_name ?? confirmModal.user.name}? No podrá acceder al panel.`
                  : `¿Reactivar la cuenta de ${confirmModal.user.business_name ?? confirmModal.user.name}?`}
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button type="button" onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280]">
                Cancelar
              </button>
              <button type="button"
                onClick={() => {
                  if (confirmModal.action === "verify") handleVerify(confirmModal.user);
                  else if (confirmModal.action === "suspend") handleSuspend(confirmModal.user, true);
                  else handleSuspend(confirmModal.user, false);
                }}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-colors ${
                  confirmModal.action === "suspend" ? "bg-red-500 hover:bg-red-600" : "bg-[#085041] hover:bg-[#1D9E75]"
                }`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
