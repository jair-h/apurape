"use client";

/* Editor de horario. Cada día se activa con un check y admite hasta dos
 * rangos (mañana y tarde), que cubre el horario partido sin volver el
 * formulario un laberinto. El modelo en la base soporta más rangos; si
 * alguna vez hacen falta tres, se sube el tope aquí. */

import { Plus, X } from "lucide-react";
import {
  type BusinessHours, type DayKey, type Range,
  DAY_ORDER, DAY_LABEL, toMinutes,
} from "@/lib/businessHours";

const RANGO_POR_DEFECTO: Range = ["09:00", "18:00"];
const MAX_RANGOS = 2;

export default function BusinessHoursEditor({
  value, onChange, accent,
}: { value: BusinessHours; onChange: (v: BusinessHours) => void; accent: string }) {

  const setDia = (d: DayKey, rangos: Range[]) => onChange({ ...value, [d]: rangos });

  const toggleDia = (d: DayKey) => {
    const abierto = (value[d] ?? []).length > 0;
    setDia(d, abierto ? [] : [[...RANGO_POR_DEFECTO] as Range]);
  };

  const setHora = (d: DayKey, i: number, pos: 0 | 1, hhmm: string) => {
    const rangos = [...(value[d] ?? [])];
    const r = [...(rangos[i] ?? RANGO_POR_DEFECTO)] as Range;
    r[pos] = hhmm;
    rangos[i] = r;
    setDia(d, rangos);
  };

  const addRango = (d: DayKey) => {
    const rangos = [...(value[d] ?? [])];
    if (rangos.length >= MAX_RANGOS) return;
    setDia(d, [...rangos, ["15:00", "19:00"] as Range]);
  };

  const quitarRango = (d: DayKey, i: number) => {
    const rangos = (value[d] ?? []).filter((_, idx) => idx !== i);
    setDia(d, rangos);
  };

  const copiarALaSemana = () => {
    const lunes = value.lun ?? [];
    onChange({
      lun: lunes, mar: lunes, mie: lunes, jue: lunes, vie: lunes,
      sab: value.sab ?? [], dom: value.dom ?? [],
    });
  };

  const inputCls = "px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:border-transparent";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide">
          Horario de atención
        </p>
        {(value.lun ?? []).length > 0 && (
          <button type="button" onClick={copiarALaSemana}
            className="text-[11px] font-bold hover:underline" style={{ color: accent }}>
            Copiar lunes a toda la semana
          </button>
        )}
      </div>

      <div className="space-y-2">
        {DAY_ORDER.map(d => {
          const rangos = value[d] ?? [];
          const abierto = rangos.length > 0;
          return (
            <div key={d} className="flex items-start gap-3 py-1.5">
              <label className="flex items-center gap-2 w-28 flex-shrink-0 cursor-pointer pt-1">
                <input type="checkbox" checked={abierto} onChange={() => toggleDia(d)}
                  className="rounded border-gray-300" style={{ accentColor: accent }} />
                <span className="text-xs font-semibold text-gray-700">{DAY_LABEL[d]}</span>
              </label>

              {!abierto ? (
                <span className="text-xs text-gray-400 pt-1.5">Cerrado</span>
              ) : (
                <div className="flex-1 space-y-1.5">
                  {rangos.map((r, i) => {
                    const a = toMinutes(r[0]), b = toMinutes(r[1]);
                    const malRango = a !== null && b !== null && b <= a;
                    return (
                      <div key={i} className="flex items-center gap-2 flex-wrap">
                        <input type="time" value={r[0]} onChange={e => setHora(d, i, 0, e.target.value)} className={inputCls} />
                        <span className="text-xs text-gray-400">a</span>
                        <input type="time" value={r[1]} onChange={e => setHora(d, i, 1, e.target.value)} className={inputCls} />
                        {rangos.length > 1 && (
                          <button type="button" onClick={() => quitarRango(d, i)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Quitar este rango">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {malRango && (
                          <span className="text-[10px] text-red-600 w-full">
                            La hora de cierre debe ser posterior a la de apertura.
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {rangos.length < MAX_RANGOS && (
                    <button type="button" onClick={() => addRango(d)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold hover:underline" style={{ color: accent }}>
                      <Plus className="h-3 w-3" /> Agregar horario de tarde
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400">
        Se muestra en tu perfil como “Abierto ahora” o “Cerrado”, en hora de Lima.
        Si lo dejas todo cerrado, no se muestra horario.
      </p>
    </div>
  );
}
