"use client";

/* Banner del concurso para el panel del plan Básico.
 *
 * Permanente y no descartable: es la razón principal para pasar a Pro, y
 * un banner que se cierra deja de existir para siempre.
 *
 * Muestra actividad real —quién ganó de verdad en su categoría— porque un
 * premio con nombre y apellido convence más que una promesa. Hasta el
 * primer cierre real no hay ganador de nada, así que cae a un texto que
 * habla del concurso en marcha en vez de dejar el hueco.
 *
 * El propio Básico puede ser el ganador: desde la 029 el mes de prueba es
 * Pro completo, así que quien ganó en su último mes de prueba y no
 * convirtió ve su propio nombre. Ese caso tiene su propio mensaje.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Props {
  providerId: string;
  accountType: string;          // 'persona' | 'negocio'
  precioPro: string;            // ya formateado, ej. "S/120"
}

interface Estado {
  categoria: string | null;
  ganador: string | null;
  ganadorEsYo: boolean;
  mesDelPremio: string | null;
}

/** Nombre del mes en español, en hora de Lima. */
const nombreMes = (d: Date) =>
  new Intl.DateTimeFormat("es-PE", { month: "long", timeZone: "America/Lima" }).format(d);

/** Un período es un date de Postgres: "2026-09-01". El mediodía UTC cae
 *  siempre en el mismo día en Lima (UTC-5), así que no se corre el mes. */
const mesDePeriodo = (period: string) => nombreMes(new Date(`${period}T12:00:00Z`));

export default function ContestBanner({ providerId, accountType, precioPro }: Props) {
  const supabase = createClient();
  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      /* 1. Su categoría: la de sus servicios. Si publicó en varias, la que
            más servicios tiene; a igualdad, la más reciente. */
      const { data: servicios } = await supabase
        .from("provider_services")
        .select("category_id, created_at, service_categories(name)")
        .eq("provider_id", providerId)
        .eq("status", "activo")
        .order("created_at", { ascending: false });

      let categoryId: string | null = null;
      let categoria: string | null = null;

      if (servicios?.length) {
        const cuenta = new Map<string, { n: number; nombre: string }>();
        for (const s of servicios as unknown as
             { category_id: string | null; service_categories: { name: string } | null }[]) {
          if (!s.category_id) continue;
          const prev = cuenta.get(s.category_id);
          cuenta.set(s.category_id, {
            n: (prev?.n ?? 0) + 1,
            nombre: prev?.nombre ?? s.service_categories?.name ?? "",
          });
        }
        // El orden de la consulta ya es por fecha, así que el primero con
        // el máximo es también el más reciente de los empatados.
        let mejor = 0;
        for (const [id, v] of cuenta) {
          if (v.n > mejor) { mejor = v.n; categoryId = id; categoria = v.nombre; }
        }
      }

      /* 2. El último ganador de esa categoría, en su mismo tipo de cuenta:
            es contra quien competiría. */
      let ganador: string | null = null;
      let ganadorEsYo = false;
      let mesDelPremio: string | null = null;

      if (categoryId) {
        const { data: rf } = await supabase
          .from("raffles")
          .select("period, winner_profile_id, profiles!raffles_winner_profile_id_fkey(name, business_name)")
          .eq("audience", "proveedor")
          .eq("category_id", categoryId)
          .eq("participant_type", accountType)
          .eq("status", "premiado")
          .not("winner_profile_id", "is", null)
          .order("period", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rf) {
          const p = (rf as unknown as
            { winner_profile_id: string; period: string;
              profiles: { name: string | null; business_name: string | null } | null });
          ganador      = p.profiles?.business_name?.trim() || p.profiles?.name?.trim() || null;
          ganadorEsYo  = p.winner_profile_id === providerId;
          mesDelPremio = p.period;
        }
      }

      if (!cancelado) setEstado({ categoria, ganador, ganadorEsYo, mesDelPremio });
    };

    cargar();
    return () => { cancelado = true; };
  }, [providerId, accountType]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Mientras carga no se reserva espacio: el banner apareciendo de golpe
     molesta menos que un hueco gris que se rellena. */
  if (!estado) return null;

  const { categoria, ganador, ganadorEsYo, mesDelPremio } = estado;

  let titulo: string;
  let cuerpo: string;

  if (ganadorEsYo && mesDelPremio) {
    titulo = `Ganaste el concurso de ${mesDePeriodo(mesDelPremio)}`;
    cuerpo = categoria
      ? `Fuiste el mejor de ${categoria} durante tu mes de prueba. Vuelve a Pro para competir otra vez.`
      : "Lo ganaste durante tu mes de prueba. Vuelve a Pro para competir otra vez.";
  } else if (ganador && mesDelPremio) {
    titulo = categoria
      ? `En ${mesDePeriodo(mesDelPremio)} ganó ${ganador} en ${categoria}`
      : `En ${mesDePeriodo(mesDelPremio)} ganó ${ganador}`;
    cuerpo = "Con Pro también puedes competir.";
  } else {
    titulo = `El concurso de ${nombreMes(new Date())} está en marcha`;
    cuerpo = categoria
      ? `Con Pro compites por ${categoria}, tu categoría.`
      : "Con Pro compites por tu categoría.";
  }

  return (
    <div className="max-w-3xl rounded-2xl border-2 border-[#0E9384] bg-teal-50 overflow-hidden">
      <div className="px-5 py-4 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#0E9384] flex items-center justify-center flex-shrink-0">
          <Trophy className="h-5 w-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-[#0E9384]">{titulo}</p>
          <p className="text-xs text-teal-900 mt-0.5 leading-relaxed">{cuerpo}</p>

          <Link href="/dashboard/plan"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-[#0E9384] text-white text-xs font-bold hover:bg-[#0B7A6E] transition-colors">
            {ganadorEsYo ? "Volver a Pro" : "Competir con Pro"} · {precioPro}/año
            <ArrowRight className="h-3 w-3" />
          </Link>

          <p className="text-[10px] text-teal-700 mt-2 leading-relaxed">
            Gana quien tenga el mejor Índice de Excelencia de su categoría.{" "}
            <Link href="/concurso" className="underline hover:no-underline">Ver las bases</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
