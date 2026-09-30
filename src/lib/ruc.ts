/* Validación del RUC peruano.
 *
 * Gemelo de public.is_valid_ruc() en la base (migración 030). Existe aquí
 * para avisar mientras se escribe, en vez de tras un viaje al servidor;
 * quien decide de verdad es la base. Si cambias uno, cambia el otro.
 *
 * Comprobar el dígito verificador rechaza números inventados, pero NO
 * demuestra que el RUC exista en SUNAT ni que sea de quien lo escribe. Eso
 * lo resuelve la verificación manual del panel de admin.
 */

const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Prefijos válidos. El 10 es "persona natural con negocio": un
 *  independiente formalizado que factura, no una excepción rara. */
const PREFIJOS = ["10", "15", "16", "17", "20"];

/** Deja solo dígitos. La base exige 11 dígitos exactos, así que el valor
 *  se limpia aquí antes de guardarlo. */
export function normalizeRuc(input: string): string {
  return (input ?? "").replace(/\D/g, "");
}

export function isValidRuc(input: string): boolean {
  const ruc = normalizeRuc(input);
  if (ruc.length !== 11) return false;
  if (!PREFIJOS.includes(ruc.slice(0, 2))) return false;

  let suma = 0;
  for (let i = 0; i < 10; i++) suma += Number(ruc[i]) * PESOS[i];

  let dv = 11 - (suma % 11);
  if (dv === 10) dv = 0;
  if (dv === 11) dv = 1;

  return dv === Number(ruc[10]);
}

/** Por qué no vale, para decírselo al usuario en vez de un "inválido" seco. */
export function rucError(input: string): string | null {
  const ruc = normalizeRuc(input);
  if (ruc.length === 0) return "Escribe tu RUC.";
  if (ruc.length < 11) return `Faltan ${11 - ruc.length} dígitos: el RUC tiene 11.`;
  if (ruc.length > 11) return "El RUC tiene 11 dígitos.";
  if (!PREFIJOS.includes(ruc.slice(0, 2))) return "Un RUC empieza por 10, 15, 16, 17 o 20.";
  if (!isValidRuc(ruc)) return "Ese RUC no es válido. Revisa los dígitos.";
  return null;
}
