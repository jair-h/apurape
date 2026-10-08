import { NextResponse, type NextRequest } from "next/server";
import { sendBrevoHtml, formatDateTimeLima } from "@/lib/brevo";

export const dynamic = "force-dynamic";

/**
 * Mensaje del formulario de Contacto (/contacto).
 *
 * Antes el formulario solo mostraba "enviado" en pantalla y el mensaje se
 * perdía: no salía correo ni se guardaba nada. Ahora el mensaje llega al
 * admin por Brevo, con replyTo del visitante para responder con un clic.
 *
 * Reusa la misma tubería que el Libro de Reclamaciones (sendBrevoHtml): no
 * hace falta plantilla. Si faltan las variables de Brevo el endpoint lo dice
 * con claridad en vez de fingir que se envió.
 */

const txt = (v: unknown, max: number): string =>
  String(v ?? "").trim().slice(0, max);

/** El contenido lo escribe el visitante y va dentro de un correo HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  const nombre  = txt(body.name, 160);
  const email   = txt(body.email, 160).toLowerCase();
  const mensaje = txt(body.message, 4000);

  const faltan: string[] = [];
  if (!nombre)                        faltan.push("nombre");
  if (!email || !email.includes("@")) faltan.push("correo electrónico");
  if (!mensaje)                       faltan.push("mensaje");

  if (faltan.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Falta completar: ${faltan.join(", ")}.` },
      { status: 400 },
    );
  }

  // El aviso va al admin; si no está configurado, cae al remitente verificado.
  const adminEmail = process.env.ADMIN_EMAIL || process.env.BREVO_SENDER_EMAIL;
  if (!adminEmail) {
    console.error("[contacto] Sin ADMIN_EMAIL ni BREVO_SENDER_EMAIL: no hay a quién avisar");
    return NextResponse.json(
      { ok: false, error: "No se pudo enviar el mensaje. Intenta de nuevo más tarde." },
      { status: 500 },
    );
  }

  const fecha = formatDateTimeLima(new Date());
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;color:#1E293B">
      <h2 style="color:#B42318;margin:0 0 4px">Nuevo mensaje de Contacto</h2>
      <p style="color:#6B7280;font-size:13px;margin:0 0 16px">Recibido el ${fecha} (hora de Lima)</p>
      <table style="font-size:13px;border-collapse:collapse;width:100%">
        <tr><td style="padding:4px 8px 4px 0;color:#6B7280">Nombre</td><td>${escapeHtml(nombre)}</td></tr>
        <tr><td style="padding:4px 8px 4px 0;color:#6B7280">Correo</td><td>${escapeHtml(email)}</td></tr>
      </table>
      <div style="background:#F9FAFB;border-radius:12px;padding:16px;margin:16px 0">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6B7280">MENSAJE</p>
        <p style="margin:0;font-size:13px;line-height:1.6;white-space:pre-wrap">${escapeHtml(mensaje)}</p>
      </div>
      <p style="font-size:12px;color:#6B7280">Responde a este correo para contestarle directamente a ${escapeHtml(nombre)}.</p>
    </div>`;

  const r = await sendBrevoHtml({
    to: adminEmail,
    toName: "Apurape",
    subject: `[Contacto] Mensaje de ${nombre}`,
    html,
    replyTo: email,
  });

  if (!r.ok) {
    console.error("[contacto] mensaje no enviado:", r.error);
    return NextResponse.json(
      { ok: false, error: "No se pudo enviar el mensaje. Intenta de nuevo más tarde." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
