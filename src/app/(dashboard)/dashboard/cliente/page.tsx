"use client";

/* Inicio del Cliente. Igual que en el panel del Proveedor, el resumen de
 * plan va arriba: recién registrado, lo primero que hay que dejar claro es
 * que para el Cliente la plataforma no cuesta nada y qué puede hacer. */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Search, Star, Check, ArrowRight, Plus, Trophy, Gift,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Perfil {
  name: string | null; business_name: string | null;
  account_type: string; points: number; level: string; district: string | null;
}

const BENEFICIOS = [
  "Publicar solicitudes ilimitadas, sin costo",
  "Recibir cotizaciones y comparar antes de elegir",
  "Chat directo con los proveedores",
  "Ganar puntos por confirmar y calificar",
];

const LEVEL_LABEL: Record<string, string> = {
  bronce: "Bronce", plata: "Plata", oro: "Oro", platino: "Platino",
};

export default function ClienteHomePage() {
  const supabase = createClient();

  const [loading, setLoading]     = useState(true);
  const [perfil, setPerfil]       = useState<Perfil | null>(null);
  const [porConfirmar, setPorConf] = useState(0);
  const [solicitudes, setSolic]   = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: p }, { count: jobs }, { count: reqs }] = await Promise.all([
        supabase.from("profiles")
          .select("name, business_name, account_type, points, level, district")
          .eq("id", user.id).maybeSingle(),
        supabase.from("jobs").select("id", { count: "exact", head: true })
          .eq("client_id", user.id).eq("status", "pendiente_confirmar"),
        supabase.from("service_requests").select("id", { count: "exact", head: true })
          .eq("client_id", user.id).eq("status", "abierta"),
      ]);

      setPerfil(p as Perfil | null);
      setPorConf(jobs ?? 0);
      setSolic(reqs ?? 0);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#0E9384] animate-spin" /></div>;
  }

  const nombre = perfil?.business_name || perfil?.name || "";

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
        <div className="px-5 py-4 bg-[#0E9384] flex items-center gap-2.5">
          <Gift className="h-5 w-5 text-white" />
          <div>
            <p className="text-sm font-extrabold text-white">Cuenta de Cliente · Gratis</p>
            <p className="text-[11px] text-teal-50">
              Contratar en Apurape no te cuesta nada, nunca.
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-3">
            Qué puedes hacer
          </p>
          <ul className="space-y-2">
            {BENEFICIOS.map(b => (
              <li key={b} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#0E9384]" />
                <span className="text-gray-700">{b}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[#6B7280] mt-4 leading-relaxed">
            Solo cobramos a los proveedores que quieren cotizar sin límite. Si más
            adelante decides ofrecer tus propios servicios, puedes cambiar de rol
            desde tu perfil.
          </p>
        </div>
      </div>

      {/* ── Puntos ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#0E9384]">{perfil?.points ?? 0}</p>
          <p className="text-xs text-[#6B7280] mt-1">Puntos acumulados</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#0E9384]">
            {LEVEL_LABEL[perfil?.level ?? "bronce"] ?? "Bronce"}
          </p>
          <p className="text-xs text-[#6B7280] mt-1">Tu nivel</p>
        </div>
      </div>

      {/* ── Siguientes pasos ─────────────────────────────────── */}
      <div className="max-w-3xl space-y-2">
        <p className="text-sm font-bold text-gray-900">Qué hacer ahora</p>

        {porConfirmar > 0 && (
          <Link href="/dashboard/cliente/trabajos"
            className="flex items-center gap-3 bg-white rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm hover:border-amber-400 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Star className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">
                Tienes {porConfirmar} {porConfirmar === 1 ? "servicio" : "servicios"} por confirmar
              </p>
              <p className="text-[11px] text-amber-800">Confirma y califica para cerrarlo y ganar puntos.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-amber-400 flex-shrink-0" />
          </Link>
        )}

        {solicitudes === 0 && (
          <Link href="/dashboard/cliente/solicitud/nueva"
            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-[#0E9384] transition-colors">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <Plus className="h-4 w-4 text-[#0E9384]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Publica lo que necesitas</p>
              <p className="text-[11px] text-[#6B7280]">Cuéntalo una vez y deja que te coticen. Gratis y sin límite.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
          </Link>
        )}

        <Link href="/servicios"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-[#0E9384] transition-colors">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Search className="h-4 w-4 text-[#0E9384]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">Buscar servicios</p>
            <p className="text-[11px] text-[#6B7280]">Explora proveedores de tu distrito por categoría.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
        </Link>

        <Link href="/dashboard/cliente/puntos"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-[#0E9384] transition-colors">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Trophy className="h-4 w-4 text-[#0E9384]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">Tus puntos y el concurso de clientes</p>
            <p className="text-[11px] text-[#6B7280]">Cada servicio confirmado te da una entrada del mes.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
        </Link>
      </div>
    </div>
  );
}
