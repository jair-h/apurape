import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPlanInfo } from "@/lib/plans";
import { sendBrevoTemplate, syncBrevoContact, splitFullName, formatDateLima, missingParams, LOGIN_URL } from "@/lib/brevo";

export const dynamic = "force-dynamic";

type CulqiCharge = {
  id?: string;
  outcome?: { type?: string };
  user_message?: string;
  merchant_message?: string;
  source?: { iin?: { card_brand?: string }; card_brand?: string };
};

/**
 * Culqi one-time charge endpoint (/v2/charges).
 * Body: { token, email, plan, rol }
 * A single annual charge — simpler than subscriptions (no RSA key required).
 * Renewal is handled manually / via webhook later.
 */
export async function POST(request: NextRequest) {
  let body: { token?: string; email?: string; plan?: string; rol?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Solicitud inválida." }, { status: 400 });
  }

  const { token, email, plan, rol } = body;
  const info = getPlanInfo(rol, plan);
  if (!token || !info || !email) {
    return NextResponse.json({ success: false, error: "Datos de pago incompletos." }, { status: 400 });
  }

  const secret = process.env.CULQI_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ success: false, error: "Pagos no configurados." }, { status: 500 });
  }

  // Session (for metadata + to activate the plan afterwards)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();

  // Real customer data for Culqi: name from profiles, email from the auth session.
  let first_name = "Cliente";
  let last_name = "MARKARU";
  let fullName = "Cliente";        // nombre real para el email (NOMBRE)
  let chargeEmail = email;
  let wasTrial = false; // paid during the free trial → gets 1 bonus month (13 total)
  if (user) {
    chargeEmail = user.email ?? email;
    const { data: profile } = await supabase.from("profiles").select("name, plan_status").eq("user_id", user.id).maybeSingle();
    wasTrial = profile?.plan_status === "trial";
    const name = (profile?.name as string)
      || (user.user_metadata?.full_name as string)
      || (user.user_metadata?.name as string)
      || "";
    fullName = String(name).trim() || "Cliente";
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    first_name = parts[0] || "Cliente";
    last_name = parts.slice(1).join(" ") || "MARKARU";
  }

  // Single charge
  let charge: CulqiCharge;
  try {
    const res = await fetch("https://api.culqi.com/v2/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: info.amountCents,
        currency_code: "USD",
        email: chargeEmail,
        source_id: token,
        description: `Plan ${info.name} - MARKARU`,
        antifraud_details: {
          first_name,
          last_name,
          address: "Av. Lima 123",
          address_city: "Lima Peru",
          country_code: "PE",
          phone_number: "51999999999",
        },
        metadata: {
          plan: info.plan,
          rol: info.rol,
          ...(user?.id ? { user_id: user.id } : {}),
        },
      }),
    });
    charge = await res.json();
    if (!res.ok || charge?.outcome?.type !== "venta_exitosa") {
      console.error("[culqi] charge error:", res.status, JSON.stringify(charge));
      return NextResponse.json(
        { success: false, error: charge?.user_message || charge?.merchant_message || "El pago fue rechazado." },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json({ success: false, error: "No se pudo conectar con el procesador de pagos." }, { status: 502 });
  }

  // El plan se activa PRIMERO; el email se envía DESPUÉS (el correo nunca activa el plan).
  // Paid during the trial → 13 months (12 + 1 bonus). Paid after trial → 12 months.
  const paidAt = new Date();
  const expires = new Date(paidAt);
  expires.setMonth(expires.getMonth() + (wasTrial ? 13 : 12));

  if (user) {
    try {
      const base = { plan_status: "active", plan_active: true, trial_ends_at: null };
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ ...base, plan_expires_at: expires.toISOString() })
        .eq("user_id", user.id);
      // Fallback if the plan_expires_at column doesn't exist yet.
      if (upErr) {
        await supabase.from("profiles").update(base).eq("user_id", user.id);
      }
    } catch (e) {
      console.error("[culqi] profile update failed after charge:", e);
    }
  }

  // Email de PAGO CONFIRMADO (plantilla BREVO_PAYMENT_TEMPLATE_ID), best-effort: no bloquea la respuesta.
  try {
    const cardBrand = charge.source?.iin?.card_brand || charge.source?.card_brand || "Tarjeta";
    const params = {
      NOMBRE: fullName,
      PLAN: info.name,
      MONTO: info.priceLabel,
      METODO_PAGO: cardBrand,
      FECHA_PAGO: formatDateLima(paidAt),
      FECHA_VENCIMIENTO: formatDateLima(expires),
      ID_TRANSACCION: charge.id ?? "",
      LOGIN_URL,
    };
    const missing = missingParams(params, [
      "NOMBRE", "PLAN", "MONTO", "METODO_PAGO", "FECHA_PAGO", "FECHA_VENCIMIENTO", "ID_TRANSACCION", "LOGIN_URL",
    ]);
    if (missing.length) {
      console.error("[culqi] email de pago: faltan params:", missing.join(", "));
    } else {
      await sendBrevoTemplate({
        to: chargeEmail,
        toName: fullName,
        templateId: Number(process.env.BREVO_PAYMENT_TEMPLATE_ID),
        params,
      });
    }
  } catch (e) {
    console.error("[culqi] email de pago falló:", e);
  }

  // Sync CRM en Brevo: plan activo + vencimiento (best-effort: no bloquea el pago ya realizado).
  try {
    const { nombre, apellido } = splitFullName(fullName);
    await syncBrevoContact({
      email: chargeEmail,
      nombre: nombre || fullName,
      apellido,
      rol: info.rol,
      plan: info.name,
      estadoPlan: "active",
      fechaVencimiento: expires.toISOString(),
    });
  } catch (e) {
    console.error("[culqi] sync de contacto Brevo falló:", e);
  }

  return NextResponse.json({ success: true, charge_id: charge.id });
}
