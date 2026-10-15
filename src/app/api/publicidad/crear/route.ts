import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Crear una campaña de publicidad (Fase 1 interna).
 *
 * Body: { kind: 'perfil'|'producto', service_id?, category_id, budget, days }
 *
 * COBRO: hoy apagado (config ad_payment_required=false) → se crea gratis y
 * pasa a 'pendiente' de revisión del admin. Cuando la perilla esté en true,
 * esta ruta cobra con Culqi ANTES de crear y pasa el id del cobro. Toda la
 * validación (solo Pro, mínimo, incrementos, categoría propia) vive en la
 * función create_promotion(), que corre con la sesión del usuario.
 */

type Body = {
  kind?: string; service_id?: string | null;
  category_id?: string; budget?: number; days?: number;
  token?: string;   // token de tarjeta Culqi (solo si los pagos están activos)
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  const { kind, service_id, category_id, budget, days, token } = body;
  if (!kind || !category_id || !budget || !days) {
    return NextResponse.json({ ok: false, error: "Faltan datos de la campaña." }, { status: 400 });
  }

  // Sesión del usuario (create_promotion lee auth.uid()).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Debes iniciar sesión." }, { status: 401 });
  }

  // ¿Los pagos están activos? Se lee con service-role (config no es público).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let paymentRequired = false;
  if (serviceKey) {
    const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await admin.from("config").select("value").eq("key", "ad_payment_required").maybeSingle();
    paymentRequired = data?.value === true;
  }

  // ── COBRO (dormido hoy; se activa con la perilla) ──────────────
  let paymentId: string | null = null;
  if (paymentRequired) {
    const secret = process.env.CULQI_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ ok: false, error: "Pagos no configurados." }, { status: 500 });
    }
    if (!token) {
      return NextResponse.json({ ok: false, error: "Falta el medio de pago." }, { status: 400 });
    }
    try {
      const res = await fetch("https://api.culqi.com/v2/charges", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(Number(budget) * 100),   // céntimos
          currency_code: "PEN",
          email: user.email ?? "",
          source_id: token,
          description: `Publicidad Apurape — ${kind}`,
          metadata: { tipo: "publicidad", kind, user_id: user.id },
        }),
      });
      const charge = await res.json();
      if (!res.ok || charge?.outcome?.type !== "venta_exitosa") {
        console.error("[publicidad] cobro rechazado:", res.status, JSON.stringify(charge));
        return NextResponse.json(
          { ok: false, error: charge?.user_message || "El pago fue rechazado." }, { status: 400 });
      }
      paymentId = charge.id ?? null;
    } catch {
      return NextResponse.json({ ok: false, error: "No se pudo conectar con el procesador de pagos." }, { status: 502 });
    }
  }

  // ── Crear la campaña (valida todo por dentro) ──────────────────
  const { data: promoId, error } = await supabase.rpc("create_promotion", {
    p_kind: kind,
    p_service_id: kind === "producto" ? (service_id ?? null) : null,
    p_category_id: category_id,
    p_budget: Math.trunc(Number(budget)),
    p_days: Math.trunc(Number(days)),
    p_payment_id: paymentId,
  });

  if (error) {
    // Si ya se cobró y la creación falla, queda registrado para revisión manual.
    if (paymentId) console.error("[publicidad] cobrado pero no creado:", paymentId, error.message);
    return NextResponse.json({ ok: false, error: error.message || "No se pudo crear la campaña." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: promoId, pending_review: true });
}
