import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Aprobar o rechazar una campaña (solo admin).
 *
 * Body: { promotion_id, action: 'aprobar'|'rechazar', reason? }
 *
 * Al APROBAR, el reloj arranca ahí (no cuando se creó): starts_at = ahora y
 * ends_at = ahora + días. Al RECHAZAR se guarda el motivo. El cambio va por
 * service-role tras verificar que quien llama es admin.
 */

export async function POST(request: NextRequest) {
  let body: { promotion_id?: string; action?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  const { promotion_id, action, reason } = body;
  if (!promotion_id || (action !== "aprobar" && action !== "rechazar")) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  // Verificar admin con la sesión.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ ok: false, error: "No configurado." }, { status: 500 });

  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Solo un administrador." }, { status: 403 });
  }

  // Solo se puede revisar algo que está pendiente.
  const { data: promo } = await admin
    .from("promotions").select("id, status, days").eq("id", promotion_id).maybeSingle();
  if (!promo) return NextResponse.json({ ok: false, error: "Campaña no encontrada." }, { status: 404 });
  if (promo.status !== "pendiente") {
    return NextResponse.json({ ok: false, error: `La campaña ya no está pendiente (${promo.status}).` }, { status: 400 });
  }

  let patch: Record<string, unknown>;
  if (action === "aprobar") {
    const now = new Date();
    const ends = new Date(now);
    ends.setDate(ends.getDate() + Number(promo.days));
    patch = {
      status: "activa",
      starts_at: now.toISOString(),
      ends_at: ends.toISOString(),
      base_days: Number(promo.days),
      reject_reason: null,
    };
  } else {
    patch = { status: "rechazada", reject_reason: String(reason ?? "").slice(0, 300) || "No cumple las reglas de publicidad." };
  }

  const { error } = await admin.from("promotions").update(patch).eq("id", promotion_id).eq("status", "pendiente");
  if (error) {
    console.error("[publicidad-admin] no se pudo actualizar:", error.message);
    return NextResponse.json({ ok: false, error: "No se pudo aplicar el cambio." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
