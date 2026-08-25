/* Paid plans — shared by the pricing cards (to build the register/checkout link)
 * and by the /activar-plan checkout page (to show the plan name + price). */

export interface PlanInfo {
  rol: string;
  plan: string;
  name: string;
  priceUsd: number;
  priceLabel: string;
  /** Amount in cents for Culqi (USD), IGV included. */
  amountCents: number;
  /** Culqi subscription plan code (created in the Culqi dashboard). */
  culqiPlanCode: string;
}

export const PAID_PLANS: Record<string, PlanInfo> = {
  "productor:productor":   { rol: "productor",     plan: "productor", name: "Productor",             priceUsd: 120,  priceLabel: "USD 120",   amountCents: 100,    culqiPlanCode: "plan-productor-markaru" }, // TEMP: 12000 -> 100 (USD 1.00) para prueba de pago
  "exportador:basic":      { rol: "exportador",    plan: "basic",     name: "Exportador Básico",     priceUsd: 360,  priceLabel: "USD 360",   amountCents: 36000,  culqiPlanCode: "plan-exportador-markaru" },
  "exportador:pro":        { rol: "exportador",    plan: "pro",       name: "Exportador PRO",        priceUsd: 960,  priceLabel: "USD 960",   amountCents: 96000,  culqiPlanCode: "plan-exportador-pro-markaru" },
  "forwarder:basic":       { rol: "forwarder",     plan: "basic",     name: "Forwarder",             priceUsd: 600,  priceLabel: "USD 600",   amountCents: 60000,  culqiPlanCode: "plan-forwarder-markaru" },
  "forwarder:pro":         { rol: "forwarder",     plan: "pro",       name: "Forwarder PRO",         priceUsd: 1200, priceLabel: "USD 1,200", amountCents: 120000, culqiPlanCode: "plan-forwarder-pro-markaru" },
  "certificadora:basic":   { rol: "certificadora", plan: "basic",     name: "Certificadora",         priceUsd: 720,  priceLabel: "USD 720",   amountCents: 72000,  culqiPlanCode: "plan-certificadora-markaru" },
  "certificadora:premium": { rol: "certificadora", plan: "premium",   name: "Certificadora Premium", priceUsd: 1200, priceLabel: "USD 1,200", amountCents: 120000, culqiPlanCode: "plan-certificadora-premium-markaru" },
  // ── Plan de prueba técnica temporal (USD 1.00) — eliminar tras verificar el flujo de pago ──
  "productor:prueba":      { rol: "productor",     plan: "prueba",    name: "Plan Prueba Técnica",   priceUsd: 1,    priceLabel: "USD 1.00",  amountCents: 100,    culqiPlanCode: "plan-prueba-markaru" },
};

export function getPlanInfo(rol?: string | null, plan?: string | null): PlanInfo | null {
  if (!rol || !plan) return null;
  return PAID_PLANS[`${rol}:${plan}`] ?? null;
}
