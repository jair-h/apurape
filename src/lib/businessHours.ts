/* Horario de atención: tipos y cálculo de "abierto ahora".
 *
 * Todo se evalúa en hora de Lima, NUNCA en la hora local del visitante.
 * Un cliente mirando el perfil desde España a las 09:00 vería "Abierto"
 * cuando en Lima son las 02:00 de la madrugada.
 *
 * No se usa `new Date()` del navegador para sacar el día ni la hora: se
 * saca de Intl con timeZone America/Lima, que es la única forma correcta
 * sin arrastrar una librería de zonas horarias. */

export type DayKey = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

/** [apertura, cierre] en formato "HH:MM", 24 h. */
export type Range = [string, string];

export type BusinessHours = Partial<Record<DayKey, Range[]>>;

export const DAY_ORDER: DayKey[] = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

export const DAY_LABEL: Record<DayKey, string> = {
  lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves",
  vie: "Viernes", sab: "Sábado", dom: "Domingo",
};

export const DAY_SHORT: Record<DayKey, string> = {
  lun: "Lun", mar: "Mar", mie: "Mié", jue: "Jue",
  vie: "Vie", sab: "Sáb", dom: "Dom",
};

/* Intl devuelve el día en inglés; se mapea a nuestras claves. */
const EN_TO_KEY: Record<string, DayKey> = {
  Mon: "lun", Tue: "mar", Wed: "mie", Thu: "jue",
  Fri: "vie", Sat: "sab", Sun: "dom",
};

export interface LimaNow { day: DayKey; minutes: number; }

/** Día y minuto actual en Lima. */
export function limaNow(at: Date = new Date()): LimaNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);

  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  const day = EN_TO_KEY[get("weekday")] ?? "lun";
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return { day, minutes };
}

/** "09:30" → 570. Devuelve null si el texto no es una hora válida. */
export function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? "");
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 570 → "9:30 a. m." en formato peruano. */
export function fmtMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const d = new Date(Date.UTC(2000, 0, 1, h, m));
  return new Intl.DateTimeFormat("es-PE", {
    hour: "numeric", minute: "2-digit", timeZone: "UTC",
  }).format(d);
}

export type HoursStatus =
  | { state: "unknown" }
  | { state: "open";   closesAt: number }
  | { state: "closed"; opensAt: number | null; opensDay: DayKey | null };

/** ¿Tiene al menos un rango en toda la semana? */
export function hasAnyHours(hours: BusinessHours | null | undefined): boolean {
  if (!hours) return false;
  return DAY_ORDER.some(d => (hours[d] ?? []).length > 0);
}

/**
 * Estado actual del proveedor.
 *
 * Los rangos que cruzan medianoche (22:00–02:00) se tratan como "hasta el
 * final del día": un oficio no suele atender de madrugada y soportar el
 * cruce complica el cálculo del "abre a las" sin beneficio real. Si algún
 * día hace falta, este es el punto donde se añade.
 */
export function hoursStatus(
  hours: BusinessHours | null | undefined,
  now: LimaNow = limaNow(),
): HoursStatus {
  if (!hasAnyHours(hours)) return { state: "unknown" };
  const h = hours as BusinessHours;

  // ¿Dentro de algún rango de hoy?
  for (const [ini, fin] of h[now.day] ?? []) {
    const a = toMinutes(ini), b = toMinutes(fin);
    if (a === null || b === null || b <= a) continue;
    if (now.minutes >= a && now.minutes < b) return { state: "open", closesAt: b };
  }

  // ¿Abre más tarde hoy?
  const hoy = (h[now.day] ?? [])
    .map(([ini]) => toMinutes(ini))
    .filter((m): m is number => m !== null && m > now.minutes)
    .sort((x, y) => x - y);
  if (hoy.length > 0) return { state: "closed", opensAt: hoy[0], opensDay: now.day };

  // Si no, el próximo día con horario, hasta una semana adelante.
  const desde = DAY_ORDER.indexOf(now.day);
  for (let i = 1; i <= 7; i++) {
    const dia = DAY_ORDER[(desde + i) % 7];
    const inicios = (h[dia] ?? [])
      .map(([ini]) => toMinutes(ini))
      .filter((m): m is number => m !== null)
      .sort((x, y) => x - y);
    if (inicios.length > 0) return { state: "closed", opensAt: inicios[0], opensDay: dia };
  }

  return { state: "closed", opensAt: null, opensDay: null };
}

/** Texto corto para la insignia: "Abierto ahora", "Cerrado, abre a las 9:00 a. m."… */
export function statusLabel(st: HoursStatus, now: LimaNow = limaNow()): string {
  if (st.state === "unknown") return "Horario no especificado";
  if (st.state === "open")    return "Abierto ahora";
  if (st.opensAt === null)    return "Cerrado";
  if (st.opensDay === now.day) return `Cerrado, abre a las ${fmtMinutes(st.opensAt)}`;
  return `Cerrado, abre ${DAY_SHORT[st.opensDay!].toLowerCase()} a las ${fmtMinutes(st.opensAt)}`;
}
