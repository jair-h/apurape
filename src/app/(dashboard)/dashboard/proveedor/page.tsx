"use client";

/* Inicio del Proveedor: reputación, estado del plan y qué le toca hacer.
 *
 * El resumen de plan está aquí a propósito: es lo primero que ve alguien
 * recién registrado, y sin él no hay forma de saber en qué plan quedó ni
 * cuántas cotizaciones le quedan hasta que entra a /dashboard/plan. */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Wrench, Star, CreditCard, Check, ArrowRight,
  Clock, Zap, Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Perfil {
  name: string | null; business_name: string | null;
  account_type: string; plan: string; plan_status: string;
  trial_ends_at: string | null; plan_expires_at: string | null;
  rating: number; ratings_count: number;
  five_star_count: number; confirmed_jobs_count: number;
  district: string | null;
}

const PRO_PRICE: Record<string, string> = { persona: "S/ 120", negocio: "S/ 330" };

export default function ProveedorHomePage() {
  const supabase = createClient();

  const [loading, setLoading]   = useState(true);
  const [perfil, setPerfil]     = useState<Perfil | null>(null);
  const [quotesLeft, setLeft]   = useState<number | null>(null);
  const [servicios, setServicios] = useState(0);
  const [porHacer, setPorHacer]   = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: p }, { data: left }, { count: svc }, { count: jobs }] = await Promise.all([
        supabase.from("profiles")
          .select("name, business_name, account_type, plan, plan_status, trial_ends_at, plan_expires_at, rating, ratings_count, five_star_count, confirmed_jobs_count, district")
          .eq("id", user.id).maybeSingle(),
        supabase.rpc("provider_quotes_left", { p_provider_id: user.id }),
        supabase.from("provider_services").select("id", { count: "exact", head: true })
          .eq("provider_id", user.id).eq("status", "activo"),
        supabase.from("jobs").select("id", { count: "exact", head: true })
          .eq("provider_id", user.id).eq("status", "agendado"),
      ]);

      setPerfil(p as Perfil | null);
      setLeft(left === null || left === undefined ? null : Number(left));
      setServicios(svc ?? 0);
      setPorHacer(jobs ?? 0);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#D92D20] animate-spin" /></div>;
  }

  const nombre = perfil?.business_name || perfil?.name || "";
  const esPro = perfil?.plan === "pro";
  const enTrial = perfil?.plan_status === "trial";
  const vencido = perfil?.plan_status === "expired";

  const diasTrial = enTrial && perfil?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(perfil.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  const beneficios = esPro
    ? [
        "Cotizaciones ilimitadas",
        "Entras al concurso mensual de tu categoría",
        "Perfil destacado en los resultados",
        "0% de comisión sobre tus ventas",
      ]
    : [
        quotesLeft === null
          ? "Cotizaciones ilimitadas durante tu mes de prueba"
          : `${quotesLeft} cotizaciones disponibles este mes`,
        "Perfil público con tus servicios",
        "Chat directo con clientes",
        "0% de comisión sobre tus ventas",
      ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">
          Hola{nombre ? `, ${nombre}` : ""}
        </h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Tú me ayudas, yo te ayudo.</p>
      </div>

      {/* ── Resumen del plan ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-3xl">
        <div className={`px-5 py-4 flex items-center justify-between gap-3 flex-wrap ${esPro ? "bg-[#B42318]" : "bg-gray-50 border-b border-gray-100"}`}>
          <div className="flex items-center gap-2.5">
            <CreditCard className={`h-5 w-5 ${esPro ? "text-white" : "text-[#D92D20]"}`} />
            <div>
              <p className={`text-sm font-extrabold ${esPro ? "text-white" : "text-gray-900"}`}>
                Plan {esPro ? "Pro" : "Básico"}
                {esPro && perfil?.account_type ? ` ${perfil.account_type === "negocio" ? "Negocio" : "Persona"}` : ""}
              </p>
              <p className={`text-[11px] ${esPro ? "text-red-100" : "text-[#6B7280]"}`}>
                {enTrial && diasTrial !== null
                  ? `Mes de prueba · ${diasTrial} ${diasTrial === 1 ? "día restante" : "días restantes"}`
                  : vencido
                  ? "Tu plan venció"
                  : esPro
                  ? perfil?.plan_expires_at
                    ? `Activo hasta el ${new Date(perfil.plan_expires_at).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}`
                    : "Activo"
                  : "Gratis, para siempre"}
              </p>
            </div>
          </div>

          {!esPro && (
            <Link href="/dashboard/plan"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D92D20] text-white text-xs font-bold hover:bg-[#B42318] transition-colors">
              <Zap className="h-3.5 w-3.5" />
              Pasar a Pro · {PRO_PRICE[perfil?.account_type ?? "persona"]}/año
            </Link>
          )}
        </div>

        <div className="px-5 py-4">
          <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-3">
            Qué incluye tu plan hoy
          </p>
          <ul className="space-y-2">
            {beneficios.map(b => (
              <li key={b} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#0E9384]" />
                <span className="text-gray-700">{b}</span>
              </li>
            ))}
          </ul>

          {!esPro && (
            <p className="text-[11px] text-[#6B7280] mt-4 leading-relaxed">
              El plan Básico no entra al concurso mensual. Con Pro tienes
              cotizaciones ilimitadas y compites por los premios de tu categoría.
            </p>
          )}

          <Link href="/dashboard/plan"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-[#D92D20] hover:underline">
            Ver detalle del plan <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── Reputación ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#D92D20]">
            {Number(perfil?.rating ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-[#6B7280] mt-1">
            {perfil?.ratings_count ? `${perfil.ratings_count} ${perfil.ratings_count === 1 ? "reseña" : "reseñas"}` : "Sin reseñas aún"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#D92D20]">{perfil?.confirmed_jobs_count ?? 0}</p>
          <p className="text-xs text-[#6B7280] mt-1">Servicios confirmados</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-amber-500">{perfil?.five_star_count ?? 0}</p>
          <p className="text-xs text-[#6B7280] mt-1">Calificaciones de 5★</p>
        </div>
      </div>

      {/* ── Siguientes pasos ─────────────────────────────────── */}
      <div className="max-w-3xl space-y-2">
        <p className="text-sm font-bold text-gray-900">Qué hacer ahora</p>

        {servicios === 0 && (
          <Link href="/dashboard/proveedor/servicios"
            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-[#D92D20] transition-colors">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3F2] flex items-center justify-center flex-shrink-0">
              <Wrench className="h-4 w-4 text-[#D92D20]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Publica tu primer servicio</p>
              <p className="text-[11px] text-[#6B7280]">Sin servicios publicados no apareces en las búsquedas.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
          </Link>
        )}

        {!perfil?.district && (
          <Link href="/dashboard/proveedor/perfil"
            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-[#D92D20] transition-colors">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3F2] flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-[#D92D20]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Completa tu distrito</p>
              <p className="text-[11px] text-[#6B7280]">Sin distrito no sales en las búsquedas por zona.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
          </Link>
        )}

        {porHacer > 0 && (
          <Link href="/dashboard/proveedor/trabajos"
            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-[#D92D20] transition-colors">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Star className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">
                Tienes {porHacer} {porHacer === 1 ? "trabajo agendado" : "trabajos agendados"}
              </p>
              <p className="text-[11px] text-[#6B7280]">Márcalos como completados cuando termines.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
          </Link>
        )}

        <Link href="/dashboard/proveedor/solicitudes"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-[#D92D20] transition-colors">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Trophy className="h-4 w-4 text-[#0E9384]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">Busca clientes</p>
            <p className="text-[11px] text-[#6B7280]">Mira las solicitudes abiertas de tu zona y cotiza.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
        </Link>
      </div>
    </div>
  );
}
