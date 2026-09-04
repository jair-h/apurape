"use client";

/* Insignia "Abierto ahora / Cerrado, abre a las X" + horario completo.
 *
 * Es un componente cliente aunque el perfil público sea server component:
 * la página se cachea 5 minutos (revalidate = 300) y un estado calculado
 * en el servidor se quedaría congelado. Aquí se recalcula al montar y cada
 * minuto, así el badge no miente después de la hora de cierre. */

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import {
  type BusinessHours, DAY_ORDER, DAY_LABEL,
  hoursStatus, statusLabel, limaNow, toMinutes, fmtMinutes, hasAnyHours,
} from "@/lib/businessHours";

export default function BusinessHoursBadge({
  hours, showTable = true,
}: { hours: BusinessHours | null; showTable?: boolean }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // tick fuerza el recálculo cada minuto sin guardar la hora en estado.
  void tick;
  const now = limaNow();
  const st = hoursStatus(hours, now);
  const label = statusLabel(st, now);

  const cls =
    st.state === "open"    ? "bg-teal-50 text-[#0E9384] border-teal-200"
  : st.state === "closed"  ? "bg-gray-100 text-gray-600 border-gray-200"
  :                          "bg-gray-50 text-gray-400 border-gray-200";

  return (
    <div>
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${st.state === "open" ? "bg-[#0E9384]" : "bg-gray-400"}`} />
        {label}
      </span>

      {showTable && hasAnyHours(hours) && (
        <div className="mt-3 space-y-1">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-1.5">
            <Clock className="h-3 w-3" /> Horario
          </p>
          {DAY_ORDER.map(d => {
            const rangos = hours?.[d] ?? [];
            const esHoy = d === now.day;
            return (
              <div key={d} className={`flex items-center justify-between text-[11px] ${esHoy ? "font-bold text-gray-900" : "text-[#6B7280]"}`}>
                <span>{DAY_LABEL[d]}</span>
                <span>
                  {rangos.length === 0
                    ? "Cerrado"
                    : rangos.map(([a, b]) => {
                        const ma = toMinutes(a), mb = toMinutes(b);
                        return ma === null || mb === null ? null : `${fmtMinutes(ma)} – ${fmtMinutes(mb)}`;
                      }).filter(Boolean).join(" · ")}
                </span>
              </div>
            );
          })}
          <p className="text-[10px] text-gray-400 pt-1">Hora de Lima</p>
        </div>
      )}
    </div>
  );
}
