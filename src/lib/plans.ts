/* Planes de pago de Apurape.
 *
 * Solo paga el PROVEEDOR, y solo el plan Pro. El Cliente nunca paga y la
 * comisión sobre ventas es 0%. El precio lo decide el tipo de cuenta
 * (persona / negocio), no el rol.
 *
 * Los mismos importes viven en la tabla `config` de Supabase
 * (price_pro_persona_cents / price_pro_negocio_cents) para poder cambiarlos
 * sin desplegar. Este archivo es la copia que necesita el checkout en
 * cliente, donde no hay sesión de base todavía. Si cambias uno, cambia el otro.
 */

export type AccountType = "persona" | "negocio";

export interface PlanInfo {
  rol: string;
  plan: string;
  accountType: AccountType;
  name: string;
  /** Precio anual en soles. */
  priceSoles: number;
  priceLabel: string;
  /** Importe en céntimos de sol para Culqi (IGV incluido). */
  amountCents: number;
  /** Código del plan de Culqi (creado en el panel de Culqi, en PEN). */
  culqiPlanCode: string;
}

export const PAID_PLANS: Record<string, PlanInfo> = {
  "proveedor:pro:persona": {
    rol: "proveedor", plan: "pro", accountType: "persona",
    name: "Pro Persona", priceSoles: 120, priceLabel: "S/ 120",
    amountCents: 12000, culqiPlanCode: "plan-pro-persona-apurape",
  },
  "proveedor:pro:negocio": {
    rol: "proveedor", plan: "pro", accountType: "negocio",
    name: "Pro Negocio", priceSoles: 330, priceLabel: "S/ 330",
    amountCents: 33000, culqiPlanCode: "plan-pro-negocio-apurape",
  },
};

export function getPlanInfo(
  rol?: string | null,
  plan?: string | null,
  accountType?: string | null,
): PlanInfo | null {
  if (!rol || !plan) return null;
  const type: AccountType = accountType === "negocio" ? "negocio" : "persona";
  return PAID_PLANS[`${rol}:${plan}:${type}`] ?? null;
}
