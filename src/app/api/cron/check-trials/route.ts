import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getPlanInfo } from "@/lib/plans";
import {
  sendBrevoTemplate, rolLabel, checkoutUrl, formatDateLima, missingParams, DEFAULT_PLAN,
} from "@/lib/brevo";

export const dynamic = "force-dynamic";

interface TrialProfile {
  id: string;
  name: string | null;
  role: string;
  account_type: string | null;
  trial_ends_at: string | null;
}

/**
 * Cron diario: avisa a los trials que están POR VENCER (~3 días antes).
 * - Lee con service-role los perfiles con plan_status='trial' cuyo trial_ends_at cae en la
 *   ventana [ahora+3d, ahora+4d). Con corrida diaria, cada trial entra a esa ventana UNA sola
 *   vez → se envía un único aviso (idempotente por la ventana de fecha, sin columna extra).
 * - NO marca el trial como vencido (sigue activo): es un aviso, no una expiración.
 * - Envía la plantilla BREVO_TRIAL_TEMPLATE_ID con:
 *     { NOMBRE, ROL, FECHA_VENCIMIENTO, PLAN, PRECIO, CHECKOUT_URL }
 * Requiere: SUPABASE_SERVICE_ROLE_KEY, BREVO_TRIAL_TEMPLATE_ID, (opcional) CRON_SECRET.
 * Programado en vercel.json.
 */
export async function GET(request: NextRequest) {
  // Auth opcional del cron (Vercel Cron envía el header si CRON_SECRET está configurado).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("[check-trials] Falta SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ ok: false, error: "Cron no configurado." }, { status: 500 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Ventana "quedan 3 días": trial_ends_at ∈ [ahora+3d, ahora+4d).
  const now = new Date();
  const from = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, role, account_type, trial_ends_at")
    .eq("plan_status", "trial")
    .gte("trial_ends_at", from.toISOString())
    .lt("trial_ends_at", to.toISOString());

  if (error) {
    console.error("[check-trials] error leyendo perfiles:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const profiles = (data ?? []) as TrialProfile[];
  let sent = 0;

  for (const p of profiles) {
    // Email del usuario (no vive en profiles; se obtiene de auth con service-role).
    let email = "";
    try {
      const { data: u } = await supabase.auth.admin.getUserById(p.id);
      email = u.user?.email ?? "";
    } catch (e) {
      console.error("[check-trials] no se pudo obtener email de", p.id, e);
    }
    if (!email) continue;

    const planKey = DEFAULT_PLAN[p.role];
    const info = planKey ? getPlanInfo(p.role, planKey, p.account_type) : null;
    const params = {
      NOMBRE: String(p.name ?? "").trim() || "Usuario",
      ROL: rolLabel(p.role),
      FECHA_VENCIMIENTO: p.trial_ends_at ? formatDateLima(new Date(p.trial_ends_at)) : "",
      PLAN: info?.name ?? "",
      PRECIO: info?.priceLabel ?? "",
      CHECKOUT_URL: checkoutUrl(p.role, planKey),
    };

    const missing = missingParams(params, [
      "NOMBRE", "ROL", "FECHA_VENCIMIENTO", "PLAN", "PRECIO", "CHECKOUT_URL",
    ]);
    if (missing.length) {
      console.error("[check-trials] faltan params para", email, "->", missing.join(", "));
      continue;
    }

    const result = await sendBrevoTemplate({
      to: email,
      toName: params.NOMBRE,
      templateId: Number(process.env.BREVO_TRIAL_TEMPLATE_ID),
      params,
    });
    if (result.ok) sent++;
  }

  return NextResponse.json({ ok: true, candidates: profiles.length, emailsSent: sent, ts: now.toISOString() });
}
