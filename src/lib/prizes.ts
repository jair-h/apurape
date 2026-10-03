/* Preferencia de premio del concurso mensual.
 *
 * ASPIRACIONAL. Indica qué le gustaría ganar, para que Apurape sepa qué
 * premios conseguir. No reserva ni garantiza nada, y nada la lee para
 * decidir quién gana: eso lo decide el Índice de Excelencia, y el premio de
 * cada concurso lo pone un administrador en raffles.prize_description.
 *
 * Las claves son las mismas del CHECK en profiles.prize_preference
 * (migración 032). Si agregas una aquí, agrégala también allí.
 */

export type AccountType = "persona" | "negocio";

export interface PrizeOption {
  value: string;
  label: string;
  /** Qué resuelve, para que la elección no sea a ciegas. */
  hint: string;
}

const PERSONA: PrizeOption[] = [
  { value: "curso",    label: "Un curso o certificación", hint: "Para cobrar más por lo que ya sabes hacer" },
  { value: "kit",      label: "Un kit de herramientas",    hint: "Para no depender de herramienta prestada" },
  { value: "mentoria", label: "Mentoría 1 a 1",            hint: "Para ordenar precios, clientes y tiempos" },
];

const NEGOCIO: PrizeOption[] = [
  { value: "fondo",        label: "Fondo para insumos o equipo", hint: "Capital para stock o una máquina" },
  { value: "marketing",    label: "Una campaña de marketing",     hint: "Para que te encuentren más clientes" },
  { value: "capacitacion", label: "Capacitación para tu equipo",  hint: "Para que todos atiendan igual de bien" },
];

export function prizeOptions(accountType: string | null | undefined): PrizeOption[] {
  return accountType === "negocio" ? NEGOCIO : PERSONA;
}

/** Etiqueta de una clave, sin importar la lista a la que pertenezca. */
export function prizeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return [...PERSONA, ...NEGOCIO].find(o => o.value === value)?.label ?? null;
}

export const ALL_PRIZES = [...PERSONA, ...NEGOCIO];
