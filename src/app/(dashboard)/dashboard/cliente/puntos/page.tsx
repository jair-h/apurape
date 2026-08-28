"use client";

/* Puntos y nivel del Cliente. Contratar en Apurape no cuesta nada; lo que
 * el Cliente gana es esto: puntos por confirmar y calificar, y entradas a
 * su propio concurso mensual. */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Star, Trophy, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface PointEvent {
  id: string; reason: string; points: number; period: string; note: string | null; created_at: string;
}

const REASON_LABEL: Record<string, string> = {
  confirmacion:          "Confirmaste un servicio",
  calificacion_recibida: "Te calificaron",
  bono:                  "Bono",
  ajuste_admin:          "Ajuste del equipo",
  premio:                "Premio de concurso",
};

const LEVELS = [
  { key: "bronce",  label: "Bronce",  min: 0 },
  { key: "plata",   label: "Plata",   min: 100 },
  { key: "oro",     label: "Oro",     min: 300 },
  { key: "platino", label: "Platino", min: 800 },
];

export default function ClientePuntosPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [points, setPoints]   = useState(0);
  const [level, setLevel]     = useState("bronce");
  const [events, setEvents]   = useState<PointEvent[]>([]);
  const [mes, setMes]         = useState<{ confirmed_jobs: number; ratings_given: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: p }, { data: ev }, { data: stats }] = await Promise.all([
        supabase.from("profiles").select("points, level").eq("id", user.id).maybeSingle(),
        supabase.from("point_events").select("id, reason, points, period, note, created_at")
          .eq("profile_id", user.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("client_monthly_stats").select("confirmed_jobs, ratings_given")
          .eq("profile_id", user.id).order("period", { ascending: false }).limit(1).maybeSingle(),
      ]);

      setPoints(p?.points ?? 0);
      setLevel(p?.level ?? "bronce");
      setEvents((ev as PointEvent[]) ?? []);
      setMes(stats ?? null);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentIdx = LEVELS.findIndex(l => l.key === level);
  const next = LEVELS[currentIdx + 1] ?? null;
  const progress = next
    ? Math.min(100, Math.round(((points - LEVELS[currentIdx].min) / (next.min - LEVELS[currentIdx].min)) * 100))
    : 100;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#0E9384] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-gray-900">Mis puntos</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Ganas puntos cada vez que confirmas un servicio y calificas.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-3xl font-extrabold text-[#0E9384]">{points}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">puntos acumulados</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0E9384] text-xs font-bold capitalize">
                <Trophy className="h-3.5 w-3.5" /> {level}
              </span>
            </div>
          </div>

          {next ? (
            <>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-[#0E9384] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Te faltan <strong className="text-gray-900">{next.min - points}</strong> puntos para nivel {next.label}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-[#6B7280]">Llegaste al nivel máximo. 🎉</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xl font-extrabold text-gray-900">{mes?.confirmed_jobs ?? 0}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">Servicios confirmados este mes</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xl font-extrabold text-gray-900">{mes?.ratings_given ?? 0}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">Calificaciones que diste</p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-5">
          <Star className="h-5 w-5 text-[#0E9384] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#0E9384]">Concurso mensual de clientes</p>
            <p className="text-xs text-teal-800 mt-1 leading-relaxed">
              Cada servicio que confirmas en el mes te da una entrada al concurso de
              clientes, separado por tipo de cuenta. No cuesta nada participar.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-900">Historial de puntos</h2>
          </div>

          {events.length === 0 ? (
            <div className="py-12 text-center">
              <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-[#6B7280]">Todavía no ganaste puntos.</p>
              <Link href="/servicios"
                className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#0E9384] text-white text-xs font-bold hover:bg-[#0B7268] transition-colors">
                Buscar un servicio
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {events.map(e => (
                <div key={e.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900">{REASON_LABEL[e.reason] ?? e.reason}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(e.created_at).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <span className={`text-sm font-extrabold flex-shrink-0 ${e.points >= 0 ? "text-[#0E9384]" : "text-red-500"}`}>
                    {e.points >= 0 ? "+" : ""}{e.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
