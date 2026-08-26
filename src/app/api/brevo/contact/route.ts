import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { syncBrevoContact, splitFullName, type SyncContactInput } from "@/lib/brevo";

export const dynamic = "force-dynamic";

/** Devuelve `a` si tiene valor no vacío; si no, `b`. */
function pick<T>(a: T | null | undefined, b: T | null | undefined): T | null {
  if (a != null && String(a).trim() !== "") return a;
  return b ?? null;
}

/**
 * UPSERT de contacto CRM en Brevo. Client-facing (registro + edición de perfil, corren en el
 * navegador). Best-effort: nunca bloquea nada.
 *
 * Fuente de verdad = Supabase. El endpoint LEE la fila `profiles` del usuario autenticado
 * (por cookies de sesión) para resolver los datos reales — en especial FECHA_FIN_TRIAL desde
 * `trial_ends_at`, que se genera en BD. Los valores del body (lo que el usuario acaba de escribir)
 * tienen prioridad; los del perfil sirven de respaldo. Solo se sincroniza CRM: no envía correos
 * ni añade a listas de marketing.
 *
 * Body: SyncContactInput parcial ({ email, nombre?, apellido?, empresa?, pais?, rol?, plan?,
 *        estadoPlan?, fechaRegistro?, fechaFinTrial?, fechaVencimiento?, idioma? }).
 */
export async function POST(request: NextRequest) {
  let body: SyncContactInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  const email = String(body?.email ?? "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Email inválido." }, { status: 400 });
  }

  // Datos autoritativos desde profiles (si hay sesión). Nunca bloquea si falla.
  let profile: Record<string, unknown> | null = null;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("name, business_name, country, role, plan, plan_status, trial_ends_at, plan_expires_at, created_at")
        .eq("id", user.id)
        .maybeSingle();
      profile = data ?? null;
    }
  } catch (e) {
    console.error("[brevo-contact] no se pudo leer profiles:", e instanceof Error ? e.message : e);
  }

  // Nombre/apellidos: prioriza lo del body; si no, parte el `name` del perfil.
  const fromName = splitFullName((profile?.name as string) ?? "");
  const nombre = pick(body.nombre, fromName.nombre);
  const apellido = pick(body.apellido, fromName.apellido);

  const merged: SyncContactInput = {
    email,
    nombre,
    apellido,
    empresa: pick(body.empresa, profile?.business_name as string),
    pais: pick(body.pais, profile?.country as string),
    rol: pick(body.rol, profile?.role as string),
    plan: pick(body.plan, profile?.plan as string),
    estadoPlan: pick(body.estadoPlan, profile?.plan_status as string),
    fechaRegistro: pick(body.fechaRegistro as string, profile?.created_at as string),
    fechaFinTrial: pick(body.fechaFinTrial as string, profile?.trial_ends_at as string), // trial_ends_at REAL
    fechaVencimiento: pick(body.fechaVencimiento as string, profile?.plan_expires_at as string),
    // Idioma: body si viene; si no, la cookie que espeja i18n (apurape_lang).
    idioma: body.idioma ?? request.cookies.get("apurape_lang")?.value ?? null,
  };

  const result = await syncBrevoContact(merged);
  return NextResponse.json(
    { ok: result.ok, action: result.action, status: result.status, skipped: result.skippedAttrs, error: result.error },
    { status: 200 },
  );
}
