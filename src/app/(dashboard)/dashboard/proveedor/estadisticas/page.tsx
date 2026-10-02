"use client";

/* Estadísticas del Proveedor.
 *
 * Persona ve lo básico; Negocio ve el desglose completo. La diferencia no es
 * artificial: a quien trabaja solo le sirve saber cómo va, y a un negocio le
 * sirve saber POR QUÉ va así, que es lo que permite corregir.
 *
 * No hay nada nuevo en la base: provider_monthly_stats ya guarda el índice y
 * sus tres componentes desde la 026.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Star, CheckCircle2, Trophy, Clock, TrendingUp,
  BarChart3, Zap, ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Perfil {
  account_type: string; plan: string; plan_status: string;
  rating: number; ratings_count: number;
  five_star_count: number; confirmed_jobs_count: number;
}

interface Mes {
  period: string;
  category_id: string;
  confirmed_jobs: number;
  ratings_count: number;
  five_star_count: number;
  avg_stars: number;
  avg_response_minutes: number | null;
  quality_score: number;
  volume_score: number;
  speed_score: number | null;
  excellence_index: number;
  was_pro: boolean;
  service_categories: { name: string } | null;
}

const mesLargo = (period: string) =>
  new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "America/Lima" })
    .format(new Date(`${period}T12:00:00Z`));

const respuesta = (min: number | null) => {
  if (min == null) return "Sin datos";
  if (min < 60) return `${Math.round(min)} min`;
  if (min < 1440) return `${(min / 60).toFixed(1)} h`;
  return `${Math.round(min / 1440)} días`;
};

function Tarjeta({ valor, etiqueta, icono: Icono, color = "#D92D20" }: {
  valor: string; etiqueta: string; icono: React.ElementType; color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <Icono className="h-4 w-4 mb-2" style={{ color }} />
      <p className="text-2xl font-extrabold" style={{ color }}>{valor}</p>
      <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">{etiqueta}</p>
    </div>
  );
}

/** Barra de un componente del índice. null = no medible, que no es cero. */
function Barra({ etiqueta, valor, peso }: { etiqueta: string; valor: number | null; peso: number }) {
  const pct = valor == null ? 0 : Math.round(valor * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[11px] font-bold text-gray-700">
          {etiqueta} <span className="text-[#6B7280] font-normal">· {peso}%</span>
        </p>
        <p className="text-[11px] font-bold text-gray-900">
          {valor == null ? "sin datos" : `${pct}%`}
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: valor == null ? "#E5E7EB" : "#0E9384" }} />
      </div>
    </div>
  );
}

export default function EstadisticasPage() {
  const supabase = createClient();

  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil]     = useState<Perfil | null>(null);
  const [meses, setMeses]       = useState<Mes[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCargando(false); return; }

      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("profiles")
          .select("account_type, plan, plan_status, rating, ratings_count, five_star_count, confirmed_jobs_count")
          .eq("id", user.id).maybeSingle(),
        supabase.from("provider_monthly_stats")
          .select("period, category_id, confirmed_jobs, ratings_count, five_star_count, avg_stars, avg_response_minutes, quality_score, volume_score, speed_score, excellence_index, was_pro, service_categories(name)")
          .eq("profile_id", user.id)
          .order("period", { ascending: false })
          .limit(12),
      ]);

      setPerfil(p as Perfil | null);
      setMeses((s as unknown as Mes[]) ?? []);
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cargando) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 text-[#D92D20] animate-spin" />
    </div>;
  }

  const esNegocio = perfil?.account_type === "negocio";
  const actual    = meses[0] ?? null;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Estadísticas</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          {esNegocio
            ? "Tu rendimiento mes a mes y de qué se compone."
            : "Cómo vas con tus clientes."}
        </p>
      </div>

      {/* ── Lo básico, para todos ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl">
        <Tarjeta icono={Star} color="#F59E0B"
          valor={Number(perfil?.rating ?? 0).toFixed(2)}
          etiqueta={`Calificación · ${perfil?.ratings_count ?? 0} reseñas`} />
        <Tarjeta icono={CheckCircle2} color="#0E9384"
          valor={String(perfil?.confirmed_jobs_count ?? 0)}
          etiqueta="Trabajos confirmados" />
        <Tarjeta icono={Trophy}
          valor={String(perfil?.five_star_count ?? 0)}
          etiqueta="Calificaciones de 5 estrellas" />
        <Tarjeta icono={TrendingUp} color="#0E9384"
          valor={actual ? (Number(actual.excellence_index) * 100).toFixed(0) : "—"}
          etiqueta="Índice de Excelencia del mes" />
      </div>

      {/* ── Lo completo, solo Negocio ──────────────────────── */}
      {esNegocio ? (
        <>
          {actual ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 max-w-4xl">
              <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
                <p className="text-sm font-extrabold text-gray-900">
                  De qué se compone tu índice
                </p>
                <p className="text-[11px] text-[#6B7280] capitalize">
                  {mesLargo(actual.period)}
                  {actual.service_categories && ` · ${actual.service_categories.name}`}
                </p>
              </div>

              <div className="space-y-3">
                <Barra etiqueta="Calidad" valor={Number(actual.quality_score)} peso={50} />
                <Barra etiqueta="Volumen" valor={Number(actual.volume_score)} peso={30} />
                <Barra etiqueta="Velocidad de respuesta"
                  valor={actual.speed_score == null ? null : Number(actual.speed_score)} peso={20} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-gray-100">
                <div>
                  <p className="flex items-center gap-1 text-[11px] text-[#6B7280]">
                    <Clock className="h-3 w-3" /> Respondes en
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {respuesta(actual.avg_response_minutes)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#6B7280]">Promedio del mes</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {Number(actual.avg_stars).toFixed(2)} ★
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#6B7280]">Trabajos del mes</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{actual.confirmed_jobs}</p>
                </div>
              </div>

              {actual.speed_score == null && (
                <p className="text-[11px] text-[#6B7280] mt-4 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                  Todavía no se puede medir tu velocidad: se calcula sobre
                  conversaciones que un cliente empezó y tú respondiste. Mientras
                  no haya ninguna, el 20% se reparte entre calidad y volumen.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center max-w-4xl">
              <BarChart3 className="h-9 w-9 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-900">Todavía no hay nada que medir</p>
              <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto leading-relaxed">
                Tus estadísticas se arman con los trabajos que un cliente
                confirma. Cuando tengas el primero, aparecen aquí.
              </p>
            </div>
          )}

          {meses.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-4xl">
              <p className="text-sm font-extrabold text-gray-900 px-5 py-4 border-b border-gray-100">
                Mes a mes
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-[#6B7280] bg-gray-50">
                      <th className="text-left  font-bold px-5 py-2">Mes</th>
                      <th className="text-right font-bold px-3 py-2">Trabajos</th>
                      <th className="text-right font-bold px-3 py-2">Promedio</th>
                      <th className="text-right font-bold px-3 py-2">Respuesta</th>
                      <th className="text-right font-bold px-5 py-2">Índice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meses.map(m => (
                      <tr key={`${m.period}-${m.category_id}`} className="border-t border-gray-100">
                        <td className="px-5 py-2.5 capitalize text-gray-700">
                          {mesLargo(m.period)}
                          {!m.was_pro && (
                            <span className="ml-1.5 text-[10px] text-[#6B7280]">· sin Pro</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{m.confirmed_jobs}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          {Number(m.avg_stars).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">
                          {respuesta(m.avg_response_minutes)}
                        </td>
                        <td className="px-5 py-2.5 text-right font-bold text-[#0E9384]">
                          {(Number(m.excellence_index) * 100).toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-[#6B7280] px-5 py-3 border-t border-gray-100 leading-relaxed">
                Los meses marcados «sin Pro» no entraron al concurso, porque el
                concurso es de los proveedores Pro.
              </p>
            </div>
          )}
        </>
      ) : (
        /* Persona: se le dice qué más vería, sin fingir que no existe. */
        <div className="max-w-4xl rounded-2xl border-2 border-[#0E9384] bg-teal-50 p-5">
          <p className="flex items-center gap-2 text-sm font-extrabold text-[#0E9384]">
            <BarChart3 className="h-4 w-4" /> Estadísticas completas con Pro Negocio
          </p>
          <p className="text-xs text-teal-900 mt-1.5 leading-relaxed max-w-lg">
            El desglose de tu Índice de Excelencia —calidad, volumen y velocidad
            de respuesta—, tu tiempo medio de respuesta y la evolución mes a mes.
            Es lo que permite saber <em>por qué</em> vas como vas, no solo cómo vas.
          </p>
          <Link href="/dashboard/plan"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-[#0E9384] text-white text-xs font-bold hover:bg-[#0B7A6E] transition-colors">
            <Zap className="h-3.5 w-3.5" /> Ver el plan Negocio <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
