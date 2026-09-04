/* Insignia de ganador del concurso mensual.
 *
 * Server component: los datos vienen del perfil, que ya se consulta.
 *
 * Solo se pinta si el premio es del mes pasado o del actual. Una insignia
 * de hace ocho meses colgada en el perfil dejaría de significar "está
 * rindiendo bien" y pasaría a ser decoración. */

import { Trophy } from "lucide-react";

const MES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** ¿El premio es reciente? Vale el mes actual y el anterior. */
export function premioVigente(period: string | null): boolean {
  if (!period) return false;
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return false;

  const ahora = new Date();
  const actual = ahora.getUTCFullYear() * 12 + ahora.getUTCMonth();
  const premio = y * 12 + (m - 1);
  return actual - premio <= 1 && actual - premio >= 0;
}

export function mesDePeriodo(period: string): string {
  const m = Number(period.split("-")[1]);
  return MES_ES[m - 1] ?? "";
}

/** Etiqueta chica, para las tarjetas del buscador. */
export function WinnerTag({ period }: { period: string | null }) {
  if (!premioVigente(period)) return null;
  return (
    <span className="inline-flex items-center gap-1 bg-teal-50 text-[#0E9384] text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-teal-200 whitespace-nowrap">
      <Trophy className="h-2.5 w-2.5" /> Ganador del mes
    </span>
  );
}

/** Insignia completa, para el perfil público. */
export default function WinnerBadge({
  period, categoria,
}: { period: string | null; categoria: string | null }) {
  if (!premioVigente(period) || !categoria) return null;

  return (
    <div className="w-full rounded-2xl border-2 border-[#0E9384] bg-teal-50 p-4 text-center">
      <div className="w-9 h-9 rounded-xl bg-[#0E9384] flex items-center justify-center mx-auto mb-2">
        <Trophy className="h-5 w-5 text-white" />
      </div>
      <p className="text-sm font-extrabold text-[#0E9384] capitalize">
        Ganador de {mesDePeriodo(period!)} · {categoria}
      </p>
      <p className="text-[11px] text-teal-800 mt-0.5 leading-relaxed">
        Mejor calidad y respuesta de su categoría
      </p>
    </div>
  );
}
