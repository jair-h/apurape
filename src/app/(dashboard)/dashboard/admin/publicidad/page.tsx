"use client";

/* Revisión de publicidad (admin).
 *
 * Cola de campañas PENDIENTES para aprobar o rechazar, con las reglas de
 * moderación a la vista. Aprobar arranca el reloj (el servidor fija starts_at
 * y ends_at). El cambio va por /api/publicidad/admin (service-role + verifica
 * que quien llama es admin).
 */

import { useEffect, useState, useCallback } from "react";
import { Loader2, Megaphone, Check, X, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Campaña {
  id: string; advertiser_id: string; kind: string; status: string;
  budget_cents: number; days: number; created_at: string;
  service_categories: { name: string } | null;
  profiles: { name: string | null; business_name: string | null; account_type: string } | null;
}

const soles = (c: number) => `S/${(c / 100).toFixed(2)}`;

const REGLAS = [
  "Rechazar si es engañoso, con precios falsos o promesas imposibles.",
  "Rechazar contenido sexual, violento, político o discriminatorio.",
  "Rechazar productos ilegales (drogas, armas, dinero fácil).",
  "Rechazar si imita la marca Apurape o parece un resultado orgánico.",
  "Aprobar lo claro, honesto y de un anunciante identificable.",
];

export default function PublicidadAdminPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [pendientes, setPendientes] = useState<Campaña[]>([]);
  const [activas, setActivas] = useState<Campaña[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const sel = "id, advertiser_id, kind, status, budget_cents, days, created_at, service_categories(name), profiles!promotions_advertiser_id_fkey(name, business_name, account_type)";
    const [{ data: pend }, { data: act }] = await Promise.all([
      supabase.from("promotions").select(sel).eq("status", "pendiente").order("created_at", { ascending: true }),
      supabase.from("promotions").select(sel).eq("status", "activa").order("created_at", { ascending: false }),
    ]);
    setPendientes((pend as unknown as Campaña[]) ?? []);
    setActivas((act as unknown as Campaña[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  async function revisar(id: string, action: "aprobar" | "rechazar") {
    let reason: string | undefined;
    if (action === "rechazar") {
      reason = window.prompt("Motivo del rechazo (lo verá el anunciante):") ?? undefined;
      if (reason === undefined) return;
    }
    setBusy(id);
    try {
      const res = await fetch("/api/publicidad/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promotion_id: id, action, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) { alert(data?.error || "No se pudo aplicar."); return; }
      await cargar();
    } finally { setBusy(null); }
  }

  const nombre = (c: Campaña) =>
    (c.profiles?.account_type === "negocio" ? c.profiles?.business_name : c.profiles?.name) || "Anunciante";

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-7 w-7 text-[#D92D20] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone className="h-6 w-6 text-[#D92D20]" />
        <h1 className="text-2xl font-extrabold text-[#1E293B]">Publicidad</h1>
      </div>
      <p className="text-sm text-[#6B7280] mb-6">Revisa y aprueba las campañas antes de que se muestren.</p>

      {/* Reglas de moderación */}
      <div className="bg-[#F9FAFB] rounded-2xl border border-gray-200 p-4 mb-8">
        <p className="text-xs font-bold text-[#6B7280] mb-2">REGLAS DE MODERACIÓN</p>
        <ul className="text-xs text-[#475467] space-y-1 list-disc pl-4">
          {REGLAS.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      {/* Pendientes */}
      <p className="font-bold text-[#1E293B] mb-3">Pendientes ({pendientes.length})</p>
      {pendientes.length === 0 ? (
        <p className="text-sm text-[#6B7280] mb-8">No hay campañas en espera. 👌</p>
      ) : (
        <div className="space-y-4 mb-10">
          {pendientes.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-[#1E293B] text-sm">{nombre(c)}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {c.kind === "producto" ? "Producto" : "Perfil"} · {c.service_categories?.name ?? "—"} ·
                    {" "}{soles(c.budget_cents)} · {c.days} días
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => revisar(c.id, "aprobar")} disabled={busy === c.id}
                    className="inline-flex items-center gap-1 bg-[#067647] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-60">
                    <Check className="h-3.5 w-3.5" /> Aprobar
                  </button>
                  <button onClick={() => revisar(c.id, "rechazar")} disabled={busy === c.id}
                    className="inline-flex items-center gap-1 bg-white border border-[#B42318] text-[#B42318] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#FEF3F2] disabled:opacity-60">
                    <X className="h-3.5 w-3.5" /> Rechazar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activas */}
      <p className="font-bold text-[#1E293B] mb-3">Activas ({activas.length})</p>
      {activas.length === 0 ? (
        <p className="text-sm text-[#6B7280]">Ninguna campaña activa.</p>
      ) : (
        <div className="space-y-3">
          {activas.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <p className="text-sm text-[#1E293B]"><strong>{nombre(c)}</strong> · {c.service_categories?.name ?? "—"} · {soles(c.budget_cents)}</p>
              <span className="inline-flex items-center gap-1 text-xs text-[#067647] font-bold"><Eye className="h-3.5 w-3.5" /> Mostrándose</span>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
