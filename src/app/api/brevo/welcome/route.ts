import { NextResponse, type NextRequest } from "next/server";
import { sendBrevoTemplate, rolLabel, accionSiguiente, LOGIN_URL, missingParams } from "@/lib/brevo";

export const dynamic = "force-dynamic";

/**
 * Email de BIENVENIDA (plantilla BREVO_WELCOME_TEMPLATE_ID).
 * Se llama desde los flujos de registro (email normal y Google OAuth) — es un endpoint
 * client-facing, por eso vive como ruta HTTP (el registro corre en el navegador).
 * Body: { email, name, rol }
 * Params enviados a Brevo: { NOMBRE, ROL, ACCION_SIGUIENTE, LOGIN_URL }
 * Best-effort: nunca rompe el registro (responde 200 aunque el email falle).
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; name?: string; rol?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Solicitud inválida." }, { status: 400 });
  }

  const { email, name, rol } = body;
  if (!email) {
    return NextResponse.json({ success: false, error: "Email requerido." }, { status: 400 });
  }

  const templateId = Number(process.env.BREVO_WELCOME_TEMPLATE_ID);
  const nombre = String(name ?? "").trim() || "Usuario";

  const params = {
    NOMBRE: nombre,
    ROL: rolLabel(rol),
    ACCION_SIGUIENTE: accionSiguiente(rol),
    LOGIN_URL,
  };

  const missing = missingParams(params, ["NOMBRE", "ROL", "ACCION_SIGUIENTE", "LOGIN_URL"]);
  if (missing.length) {
    console.error("[brevo] welcome: faltan params:", missing.join(", "));
    return NextResponse.json({ success: false, error: `Faltan params: ${missing.join(", ")}` }, { status: 200 });
  }

  const result = await sendBrevoTemplate({ to: email, toName: nombre, templateId, params });
  return NextResponse.json(
    { success: result.ok, brevoStatus: result.brevoStatus, messageId: result.messageId, error: result.error },
    { status: 200 },
  );
}
