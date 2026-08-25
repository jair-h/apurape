"use client";

/* Sorteo mensual del Proveedor: si califica, en qué posición va y qué le
 * falta. La regla vive en la base (provider_monthly_stats.qualifies), esta
 * pantalla solo la explica. */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Trophy, Star, CheckCircle2, Lock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface StatRow {
  period: string; category_id: string;
  confirmed_jobs: number; five_star_count: number; avg_stars: number; qualifies: boolean;
}

interface RaffleRow {
  id: string; period: string; category_id: string | null;
  participant_type: string; prize_type: string; prize_description: string | null;
  status: string; entries_total: number; winner_profile_id: string | null;
}

interface EntryRow { raffle_id: string; entries: number; score: number; rank: number | null; }

const PRIZE_LABEL: Record<string, string> = {
  destacado:     "Perfil destacado",
  upgrade:       "Upgrade de plan",
  badge:         "Insignia",
  cotizaciones:  "Cotizaciones extra",
  efectivo:      "Premio en efectivo",
  curso:         "Curso",
  financiamiento:"Financiamiento",
};

export default function SorteoPage() {
  const supabase = createClient();

  const [loading, setLoading]   = useState(true);
  const [plan, setPlan]         = useState("basico");
  const [accountType, setType]  = useState("persona");
  const [stats, setStats]       = useState<StatRow[]>([]);
  const [raffles, setRaffles]   = useState<RaffleRow[]>([]);
  const [entries, setEntries]   = useState<EntryRow[]>([]);
  const [cats, setCats]         = useState<Record<string, string>>({});
  const [minFive, setMinFive]   = useState(3);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: period } = await supabase.rpc("current_period");

      const [{ data: p }, { data: st }, { data: rf }, { data: en }, { data: cs }, { data: cfg }] = await Promise.all([
        supabase.from("profiles").select("plan, account_type").eq("id", user.id).maybeSingle(),
        supabase.from("provider_monthly_stats").select("period, category_id, confirmed_jobs, five_star_count, avg_stars, qualifies")
          .eq("profile_id", user.id).eq("period", period),
        supabase.from("raffles").select("*").eq("period", period).eq("audience", "proveedor"),
        supabase.from("raffle_entries").select("raffle_id, entries, score, rank").eq("profile_id", user.id),
        supabase.from("service_categories").select("id, name"),
        supabase.from("config").select("value").eq("key", "raffle_min_five_stars").maybeSingle(),
      ]);

      setPlan(p?.plan ?? "basico");
      setType(p?.account_type ?? "persona");
      setStats((st as StatRow[]) ?? []);
      setRaffles((rf as RaffleRow[]) ?? []);
      setEntries((en as EntryRow[]) ?? []);
      setCats(Object.fromEntries((cs ?? []).map((c: { id: string; name: string }) => [c.id, c.name])));
      if (cfg?.value != null) setMinFive(Number(cfg.value));
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const esPro = plan === "pro";
  const misRaffles = raffles.filter(r => r.participant_type === accountType);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#D92D20] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-gray-900">Sorteo del mes</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Ventas confirmadas por el cliente + al menos {minFive} calificaciones de 5 estrellas
            en el mes, dentro de tu categoría.
          </p>
        </div>

        {!esPro && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
            <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">El sorteo es para el plan Pro</p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Puedes ir acumulando ventas y calificaciones desde ahora, pero para
                entrar al sorteo necesitas el plan Pro.
              </p>
              <Link href="/dashboard/plan"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-[#D92D20] hover:underline">
                Ver el plan Pro <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        <h2 className="text-sm font-bold text-gray-900 mb-3">Cómo vas este mes</h2>

        {stats.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center mb-6">
            <Trophy className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-900">Todavía no tienes ventas confirmadas este mes</p>
            <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto leading-relaxed">
              Solo cuentan los servicios que el cliente confirmó. Que tú los marques
              como completados no suma.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {stats.map(s => {
              const faltan = Math.max(0, minFive - s.five_star_count);
              return (
                <div key={s.category_id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-bold text-gray-900">{cats[s.category_id] ?? "Categoría"}</p>
                    {s.qualifies ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 className="h-3 w-3" /> Califica
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        Aún no
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-lg font-extrabold text-gray-900">{s.confirmed_jobs}</p>
                      <p className="text-[10px] text-[#6B7280]">Confirmadas</p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-amber-500">{s.five_star_count}</p>
                      <p className="text-[10px] text-[#6B7280]">De 5 estrellas</p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-gray-900">{Number(s.avg_stars).toFixed(1)}</p>
                      <p className="text-[10px] text-[#6B7280]">Promedio</p>
                    </div>
                  </div>

                  {faltan > 0 && (
                    <p className="text-[11px] text-[#6B7280] pt-3 border-t border-gray-100">
                      Te {faltan === 1 ? "falta" : "faltan"}{" "}
                      <strong className="text-[#D92D20]">{faltan}</strong>{" "}
                      {faltan === 1 ? "calificación" : "calificaciones"} de 5 estrellas para entrar.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <h2 className="text-sm font-bold text-gray-900 mb-3">Sorteos abiertos de tu tipo de cuenta</h2>

        {misRaffles.length === 0 ? (
          <p className="text-xs text-[#6B7280] bg-white rounded-2xl border border-gray-200 p-5">
            No hay sorteos abiertos ahora mismo.
          </p>
        ) : (
          <div className="space-y-2">
            {misRaffles.map(r => {
              const entry = entries.find(e => e.raffle_id === r.id);
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900">
                      {r.category_id ? (cats[r.category_id] ?? "Categoría") : "General"}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      {r.prize_description ?? PRIZE_LABEL[r.prize_type] ?? r.prize_type}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {entry ? (
                      <>
                        <p className="text-sm font-extrabold text-[#D92D20]">
                          {entry.rank ? `#${entry.rank}` : "—"}
                        </p>
                        <p className="text-[10px] text-[#6B7280]">
                          {entry.entries} {entry.entries === 1 ? "entrada" : "entradas"}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                        <Star className="h-3 w-3" /> sin entradas
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
          El ganador se decide por ranking automático (más calificaciones de 5 estrellas,
          luego más ventas confirmadas), no por votación. Los trabajos entre cuentas que se
          contratan mutuamente quedan excluidos.
        </p>
      </div>
    </div>
  );
}
