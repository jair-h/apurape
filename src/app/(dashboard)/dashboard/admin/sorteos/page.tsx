"use client";

/* Gestión de concursos. El cálculo y el cierre viven en la base
 * (compute_raffle_entries / close_raffle); esta pantalla solo los dispara
 * y muestra el ranking resultante. */

import { useState, useEffect } from "react";
import { Loader2, Trophy, RefreshCw, Lock, Play } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface RaffleRow {
  id: string; period: string; audience: string; category_id: string | null;
  participant_type: string; prize_type: string; prize_description: string | null;
  status: string; entries_total: number; winner_profile_id: string | null;
  closed_at: string | null;
}

interface EntryRow {
  raffle_id: string; profile_id: string; entries: number;
  confirmed_jobs: number; five_star_count: number; score: number; rank: number | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  abierto:  { label: "Abierto",  cls: "bg-teal-50 text-[#0E9384] border-teal-200" },
  cerrado:  { label: "Cerrado",  cls: "bg-gray-100 text-gray-600 border-gray-200" },
  premiado: { label: "Premiado", cls: "bg-green-50 text-green-700 border-green-200" },
  anulado:  { label: "Anulado",  cls: "bg-red-50 text-red-700 border-red-200" },
};

export default function AdminSorteosPage() {
  const supabase = createClient();

  const [loading, setLoading]     = useState(true);
  const [raffles, setRaffles]     = useState<RaffleRow[]>([]);
  const [cats, setCats]           = useState<Record<string, string>>({});
  const [names, setNames]         = useState<Record<string, string>>({});
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [entries, setEntries]     = useState<EntryRow[]>([]);
  const [working, setWorking]     = useState<string | null>(null);

  const load = async () => {
    const [{ data: rf }, { data: cs }] = await Promise.all([
      supabase.from("raffles").select("*").order("period", { ascending: false }).order("audience"),
      supabase.from("service_categories").select("id, name"),
    ]);
    setRaffles((rf as RaffleRow[]) ?? []);
    setCats(Object.fromEntries((cs ?? []).map((c: { id: string; name: string }) => [c.id, c.name])));

    const winnerIds = ((rf as RaffleRow[]) ?? []).map(r => r.winner_profile_id).filter(Boolean) as string[];
    if (winnerIds.length > 0) {
      const { data: ps } = await supabase.from("profiles").select("id, name, business_name").in("id", winnerIds);
      setNames(Object.fromEntries((ps ?? []).map((p: { id: string; name: string | null; business_name: string | null }) =>
        [p.id, p.business_name || p.name || "Usuario"])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openEntries = async (r: RaffleRow) => {
    if (expanded === r.id) { setExpanded(null); return; }
    setExpanded(r.id);
    const { data } = await supabase.from("raffle_entries").select("*")
      .eq("raffle_id", r.id).order("rank", { ascending: true });
    const rows = (data as EntryRow[]) ?? [];
    setEntries(rows);

    const ids = rows.map(e => e.profile_id);
    if (ids.length > 0) {
      const { data: ps } = await supabase.from("profiles").select("id, name, business_name").in("id", ids);
      setNames(prev => ({
        ...prev,
        ...Object.fromEntries((ps ?? []).map((p: { id: string; name: string | null; business_name: string | null }) =>
          [p.id, p.business_name || p.name || "Usuario"])),
      }));
    }
  };

  const recompute = async (r: RaffleRow) => {
    setWorking(r.id);
    const { error } = await supabase.rpc("compute_raffle_entries", { p_raffle_id: r.id });
    if (error) alert(`No se pudo recalcular:\n${error.message}`);
    else { await load(); if (expanded === r.id) { setExpanded(null); await openEntries(r); } }
    setWorking(null);
  };

  const close = async (r: RaffleRow) => {
    if (!confirm("Cerrar el concurso marca al ganador por ranking y no se puede deshacer. ¿Continuar?")) return;
    setWorking(r.id);
    const { error } = await supabase.rpc("close_raffle", { p_raffle_id: r.id });
    if (error) alert(`No se pudo cerrar:\n${error.message}`);
    else await load();
    setWorking(null);
  };

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#B42318] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">Concursos</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Recalcular vuelve a construir los conteos del mes desde los trabajos y
          las calificaciones, y marca los pares recíprocos antes de rankear.
        </p>
      </div>

      {raffles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <Trophy className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-900">No hay concursos creados</p>
          <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto leading-relaxed">
            Se crean con open_monthly_raffles() al inicio de cada mes.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {raffles.map(r => {
            const st = STATUS[r.status] ?? STATUS.abierto;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900">
                      {new Date(r.period).toLocaleDateString("es-PE", { month: "long", year: "numeric" })}
                      {" · "}
                      <span className="capitalize">{r.audience}</span>
                      {" · "}
                      <span className="capitalize">{r.participant_type}</span>
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      {r.category_id ? (cats[r.category_id] ?? "Categoría") : "General"} —{" "}
                      {r.prize_description ?? r.prize_type}
                    </p>
                    {r.winner_profile_id && (
                      <p className="text-[11px] text-green-700 font-semibold mt-1">
                        Ganador: {names[r.winner_profile_id] ?? "—"}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-[#6B7280]">{r.entries_total} participantes</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>

                    <button type="button" onClick={() => openEntries(r)}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[10px] font-bold text-[#6B7280] hover:border-[#B42318] transition-colors">
                      {expanded === r.id ? "Ocultar" : "Ranking"}
                    </button>

                    {r.status === "abierto" && (
                      <>
                        <button type="button" onClick={() => recompute(r)} disabled={working === r.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[10px] font-bold text-[#6B7280] hover:border-[#B42318] transition-colors disabled:opacity-50">
                          {working === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Recalcular
                        </button>
                        <button type="button" onClick={() => close(r)} disabled={working === r.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#B42318] text-white text-[10px] font-bold hover:bg-[#D92D20] transition-colors disabled:opacity-50">
                          <Lock className="h-3 w-3" /> Cerrar y premiar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {expanded === r.id && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    {entries.length === 0 ? (
                      <p className="text-[11px] text-[#6B7280] text-center py-3">
                        Sin participantes. Nadie llegó al mínimo de calificaciones de 5 estrellas.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {entries.map(e => (
                          <div key={e.profile_id} className="flex items-center gap-3 text-[11px]">
                            <span className="w-6 font-extrabold text-[#B42318]">#{e.rank ?? "—"}</span>
                            <span className="flex-1 font-semibold text-gray-900 truncate">{names[e.profile_id] ?? "Usuario"}</span>
                            <span className="text-[#6B7280]">{e.confirmed_jobs} ventas</span>
                            <span className="text-amber-500">{e.five_star_count} × 5★</span>
                            <span className="text-[#6B7280]">{e.entries} entradas</span>
                            <span className="font-bold text-gray-900 w-12 text-right">{Number(e.score).toFixed(0)} pts</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-4 leading-relaxed max-w-2xl">
        <Play className="h-3 w-3 inline" /> Al cerrar, close_raffle() recalcula, marca los
        pares recíprocos del periodo y asigna el ganador al puesto #1. Si no hay
        participantes, el concurso queda anulado.
      </p>
    </div>
  );
}
