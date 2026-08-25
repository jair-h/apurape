"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2, XCircle, Clock, Building2,
  User, Shield, Loader2, Bell,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Types ───────────────────────────────────────────────── */

type Decision = "aprobado" | "rechazado" | null;

interface PendingUser {
  id: string;
  user_id: string;
  name: string | null;
  business_name: string | null;
  role: string;
  country: string | null;
  region: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  productor: "Productor", exportador: "Exportador", forwarder: "Forwarder",
  certificadora: "Certificadora", comprador: "Comprador", banco: "Banco",
};

const ROLE_COLORS: Record<string, string> = {
  productor:    "bg-green-100 text-green-700",
  exportador:   "bg-blue-100 text-blue-700",
  forwarder:    "bg-purple-100 text-purple-700",
  certificadora:"bg-amber-100 text-amber-700",
  comprador:    "bg-pink-100 text-pink-700",
  banco:        "bg-gray-100 text-gray-700",
};

/* ─── User verification card ──────────────────────────────── */

function UserCard({
  user, decision, onApprove, onReject, loading,
}: {
  user: PendingUser;
  decision: Decision;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  loading: boolean;
}) {
  const displayName = user.business_name ?? user.name ?? "Usuario";
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      decision === "aprobado"  ? "border-[#1D9E75]/50 opacity-80" :
      decision === "rechazado" ? "border-red-200 opacity-60"      :
                                 "border-gray-200 hover:shadow-md"
    }`}>
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center flex-shrink-0 text-base font-extrabold text-[#085041]">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-[#085041] truncate">{displayName}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>
            {user.name && user.business_name && (
              <p className="text-xs text-[#6B7280] truncate">{user.name}</p>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-[#6B7280]">Registrado</p>
          <p className="text-[11px] font-semibold text-[#1E293B]">{fmtDate(user.created_at)}</p>
        </div>
      </div>

      {/* Location */}
      <div className="px-5 pb-4 flex items-center gap-4 text-xs text-[#6B7280]">
        {user.business_name || user.name ? (
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-[#1D9E75]" />
            <span className="font-semibold text-[#1E293B]">{user.business_name ?? user.name}</span>
          </span>
        ) : null}
        {user.region && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{user.region}</span>}
        {user.country && <span>{user.country}</span>}
      </div>

      {/* Decision result */}
      {decision && (
        <div className={`mx-5 mb-4 rounded-xl px-4 py-3 flex items-center gap-2.5 ${
          decision === "aprobado" ? "bg-[#E1F5EE]" : "bg-red-50"
        }`}>
          {decision === "aprobado"
            ? <CheckCircle2 className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
            : <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
          <p className={`text-xs font-bold ${decision === "aprobado" ? "text-[#085041]" : "text-red-700"}`}>
            {decision === "aprobado"
              ? "Usuario aprobado — cuenta verificada activada"
              : "Usuario rechazado — acceso denegado"}
          </p>
        </div>
      )}

      {/* Actions */}
      {!decision && (
        <div className="px-5 pb-5 flex gap-2">
          <button type="button" onClick={() => onReject(user.user_id)} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border-2 border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
            <XCircle className="h-4 w-4" /> Rechazar
          </button>
          <button type="button" onClick={() => onApprove(user.user_id)} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><CheckCircle2 className="h-4 w-4" /> Aprobar</>}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function VerificacionPage() {
  const [queue, setQueue]         = useState<PendingUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        // profiles.id ES el id de auth; se alias a user_id para el resto de la pantalla.
        .select("id, user_id:id, name, business_name, role, country, region, created_at")
        .eq("verified", false)
        .neq("role", "admin")
        .order("created_at", { ascending: false });

      if (error) console.error("[verificacion]", error);
      setQueue(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const handleApprove = async (userId: string) => {
    setLoadingId(userId);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ verified: true })
      .eq("id", userId);
    if (error) console.error("[approve]", error);
    setDecisions((p) => ({ ...p, [userId]: "aprobado" }));
    setLoadingId(null);
  };

  const handleReject = (userId: string) => {
    setDecisions((p) => ({ ...p, [userId]: "rechazado" }));
  };

  const pending  = queue.filter((u) => !decisions[u.user_id]);
  const resolved = queue.filter((u) => !!decisions[u.user_id]);

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Cola de verificación</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Revisa y aprueba o rechaza cada cuenta nueva sin verificar.
          </p>
        </div>
        {pending.length > 0 && (
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-2 rounded-xl text-xs font-bold">
            <Bell className="h-4 w-4" />
            {pending.length} pendiente{pending.length > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pendientes",  value: pending.length,                                              cls: "text-amber-600" },
          { label: "Aprobados",   value: Object.values(decisions).filter((d) => d === "aprobado").length,  cls: "text-[#1D9E75]" },
          { label: "Rechazados",  value: Object.values(decisions).filter((d) => d === "rechazado").length, cls: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm text-center">
            <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-[#6B7280] mt-0.5 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending section */}
      {pending.length === 0 && resolved.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <CheckCircle2 className="h-10 w-10 text-[#1D9E75] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#085041]">Cola vacía</p>
          <p className="text-xs text-[#6B7280] mt-1">No hay usuarios sin verificar en este momento.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-[#085041] flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> Pendientes de revisión
              </h2>
              {pending.map((u) => (
                <UserCard
                  key={u.user_id} user={u}
                  decision={decisions[u.user_id] ?? null}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  loading={loadingId === u.user_id}
                />
              ))}
            </section>
          )}

          {resolved.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-[#085041] flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#1D9E75]" /> Resueltos esta sesión
              </h2>
              {resolved.map((u) => {
                const approved = decisions[u.user_id] === "aprobado";
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
            </section>
          )}
        </>
      )}
    </div>
  );
}

