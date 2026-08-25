"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, CreditCard, Users, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Types ───────────────────────────────────────────────── */

interface Member {
  user_id: string;
  name: string | null;
  business_name: string | null;
  role: string;
  plan: string;
  plan_status: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

const PLAN_STATUS: Record<string, { label: string; cls: string }> = {
  trial:   { label: "Trial",   cls: "bg-amber-100 text-amber-700" },
  active:  { label: "Activo",  cls: "bg-[#E1F5EE] text-[#085041]" },
  expired: { label: "Expirado",cls: "bg-red-100 text-red-600" },
  free:    { label: "Gratis",  cls: "bg-gray-100 text-gray-500" },
};

const PLAN_PRICES: Record<string, number> = {
  productor:    100,
  exportador:   150,
  forwarder:     80,
  certificadora:120,
};

/* ─── Page ────────────────────────────────────────────────── */

export default function CobrosPage() {
  const [loading, setLoading]   = useState(true);
  const [members, setMembers]   = useState<Member[]>([]);
  const [tab, setTab]           = useState<"memberships" | "trial">("memberships");

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, business_name, role, plan, plan_status, trial_ends_at, created_at")
        .neq("role", "admin")
        .order("created_at", { ascending: false });

      setMembers((data ?? []) as Member[]);
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

  const paid      = members.filter((m) => m.plan_status === "active");
  const inTrial   = members.filter((m) => m.plan_status === "trial");
  const expired   = members.filter((m) => m.plan_status === "expired");
  const totalMRR  = paid.reduce((s, m) => s + (PLAN_PRICES[m.role] ?? 0), 0);

  const displayed = tab === "memberships" ? paid : inTrial;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#085041]">Cobros e ingresos</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Ingresos por membresías anuales.</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-[#085041] rounded-2xl p-5 text-white">
          <p className="text-xs font-semibold text-green-300 uppercase tracking-wider mb-1">MRR estimado</p>
          <p className="text-4xl font-extrabold">USD {totalMRR.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-green-300">
            <TrendingUp className="h-4 w-4" /> Membresías activas
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
              <Users className="h-4 w-4 text-[#1D9E75]" />
            </div>
            <p className="text-xs font-bold text-[#085041]">Activos</p>
          </div>
          <p className="text-2xl font-extrabold text-[#085041]">{paid.length}</p>
          <p className="text-[10px] text-[#6B7280] mt-0.5">membresías pagas</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-xs font-bold text-[#085041]">En prueba</p>
          </div>
          <p className="text-2xl font-extrabold text-amber-600">{inTrial.length}</p>
          <p className="text-[10px] text-[#6B7280] mt-0.5">{expired.length} expirados</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: "memberships" as const, label: `Activos (${paid.length})` },
          { key: "trial"       as const, label: `En prueba (${inTrial.length})` },
        ]).map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              tab === t.key
                ? "bg-[#085041] text-white shadow-sm"
                : "bg-white border border-gray-200 text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden pb-4">
        {displayed.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#085041]">Sin usuarios en esta categoría</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-4 py-3 bg-gray-50 border-b border-gray-100">
              {["Usuario", "Rol", "Estado", "Registrado"].map((h) => (
                <div key={h} className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{h}</div>
              ))}
            </div>
            {displayed.map((m) => {
              const displayName = m.business_name ?? m.name ?? "Usuario";
              const st = PLAN_STATUS[m.plan_status ?? "free"] ?? PLAN_STATUS.free;
              return (
                <div key={m.user_id} className="grid grid-cols-[2fr_1fr_1fr_1fr] px-4 py-3 text-xs border-b border-gray-50 hover:bg-gray-50 transition-colors items-center">
                  <div>
                    <p className="font-semibold text-[#1E293B]">{displayName}</p>
                    {m.name && m.business_name && (
                      <p className="text-[10px] text-[#6B7280]">{m.name}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                      {m.role}
                    </span>
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>
                      {st.label}
                    </span>
                    {m.trial_ends_at && m.plan_status === "trial" && (
                      <p className="text-[10px] text-[#6B7280] mt-0.5">
                        Expira {new Date(m.trial_ends_at).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                  <div className="text-[#6B7280]">
                    {new Date(m.created_at).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "2-digit" })}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between px-4 pt-4">
              <p className="text-xs text-[#6B7280]">{displayed.length} usuarios</p>
              {tab === "memberships" && (
                <p className="text-sm font-extrabold text-[#085041]">Total estimado: USD {totalMRR.toLocaleString()}/año</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

