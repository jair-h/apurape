import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { sendBrevoHtml, formatDateTimeLima, SITE_URL } from "@/lib/brevo";

export const dynamic = "force-dynamic";

/**
 * Alta de un reclamo o queja del Libro de Reclamaciones (DS 011-2011-PCM).
 *
 * POR QUÉ PASA POR AQUÍ Y NO DIRECTO DESDE EL NAVEGADOR
 * La política de la tabla permite INSERT a cualquiera, como exige la norma,
 * pero no SELECT: nadie debe poder leer los reclamos de otros. El efecto
 * secundario es que el navegador tampoco puede leer de vuelta su propio
 * correlativo, y el consumidor tiene derecho a conocerlo. Aquí se inserta
 * con la service role, se lee el correlativo y se devuelve.
 *
 * El correo es una obligación legal, así que NO bloquea la constancia: si
 * Brevo falla, el reclamo ya está guardado y el consumidor igual recibe su
 * número en pantalla. El fallo se registra en el log.
 */

const DOC_TIPOS = ["dni", "ce", "pasaporte"] as const;
const TIPOS     = ["reclamo", "queja"] as const;
const BIENES    = ["producto", "servicio"] as const;

interface Body {
  nombre?: string; doc_tipo?: string; documento?: string;
  direccion?: string; telefono?: string; email?: string;
  es_menor?: boolean; apoderado?: string;
  bien_servicio?: string; monto?: string; bien_descripcion?: string;
  tipo?: string; descripcion?: string; pedido?: string;
}

const txt = (v: unknown, max: number): string =>
  String(v ?? "").trim().slice(0, max);

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  /* ── Validación. Se repite aquí aunque el formulario ya valide: el
     endpoint es público y no puede confiar en quien lo llama. ── */
  const nombre      = txt(body.nombre, 160);
  const documento   = txt(body.documento, 20);
  const email       = txt(body.email, 160).toLowerCase();
  const descripcion = txt(body.descripcion, 2000);
  const pedido      = txt(body.pedido, 2000);
  const esMenor     = body.es_menor === true;
  const apoderado   = txt(body.apoderado, 160);

  const docTipo = DOC_TIPOS.includes(body.doc_tipo as typeof DOC_TIPOS[number])
    ? body.doc_tipo! : null;
  const tipo = TIPOS.includes(body.tipo as typeof TIPOS[number]) ? body.tipo! : null;
  const bien = BIENES.includes(body.bien_servicio as typeof BIENES[number])
    ? body.bien_servicio! : null;

  const faltan: string[] = [];
  if (!nombre)                 faltan.push("nombres y apellidos");
  if (!docTipo)                faltan.push("tipo de documento");
  if (!documento)              faltan.push("número de documento");
  if (!email || !email.includes("@")) faltan.push("correo electrónico");
  if (!tipo)                   faltan.push("tipo (reclamo o queja)");
  if (!descripcion)            faltan.push("detalle del reclamo");
  if (!pedido)                 faltan.push("pedido del consumidor");
  if (esMenor && !apoderado)   faltan.push("nombre del padre, madre o apoderado");

  if (faltan.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Falta completar: ${faltan.join(", ")}.` },
      { status: 400 },
    );
  }

  /* El monto es opcional; un texto no numérico se guarda como nulo en vez
     de romper el alta por un dato que la norma no exige. */
  const montoNum = Number(String(body.monto ?? "").replace(",", "."));
  const monto = Number.isFinite(montoNum) && montoNum > 0 ? montoNum : null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("[reclamaciones] Falta SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json(
      { ok: false, error: "No se pudo registrar el reclamo. Escríbenos desde la página de Contacto." },
      { status: 500 },
    );
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("reclamaciones")
    .insert({
      nombre,
      doc_tipo: docTipo,
      documento,
      direccion:        txt(body.direccion, 240) || null,
      telefono:         txt(body.telefono, 40) || null,
      email,
      es_menor:         esMenor,
      apoderado:        esMenor ? apoderado : null,
      bien_servicio:    bien,
      monto,
      bien_descripcion: txt(body.bien_descripcion, 1000) || null,
      tipo,
      descripcion,
      pedido,
    })
    .select("codigo, created_at")
    .single();

  if (error || !data) {
    console.error("[reclamaciones] error al insertar:", error?.message);
    return NextResponse.json(
      { ok: false, error: "No se pudo registrar el reclamo. Intenta de nuevo o escríbenos desde Contacto." },
      { status: 500 },
    );
  }

  const codigo = data.codigo as string;
  const fecha  = formatDateTimeLima(new Date(data.created_at as string));
  const esReclamo = tipo === "reclamo";
  const etiqueta  = esReclamo ? "reclamo" : "queja";

  /* ── Constancia al consumidor ── */
  const htmlConsumidor = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1E293B">
      <h2 style="color:#B42318;margin:0 0 4px">Recibimos tu ${etiqueta}</h2>
      <p style="color:#6B7280;font-size:14px;margin:0 0 20px">Libro de Reclamaciones de Apurape</p>

      <div style="border:2px solid #0E9384;border-radius:12px;padding:16px;text-align:center;margin-bottom:20px">
        <p style="margin:0;font-size:12px;color:#6B7280">Número de ${etiqueta}</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:#0E9384;letter-spacing:1px">${codigo}</p>
      </div>

      <p style="font-size:14px;line-height:1.6">
        Hola ${nombre}, registramos tu ${etiqueta} el <strong>${fecha}</strong> (hora de Lima).
        Guarda este número: es tu constancia.
      </p>
      <p style="font-size:14px;line-height:1.6">
        Tenemos un plazo de <strong>15 días hábiles</strong> para darte una respuesta,
        conforme al Código de Protección y Defensa del Consumidor. Te escribiremos a
        este mismo correo.
      </p>

      <div style="background:#F9FAFB;border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6B7280">LO QUE NOS CONTASTE</p>
        <p style="margin:0;font-size:13px;line-height:1.6;white-space:pre-wrap">${escapeHtml(descripcion)}</p>
        <p style="margin:12px 0 6px;font-size:12px;font-weight:700;color:#6B7280">LO QUE PIDES</p>
        <p style="margin:0;font-size:13px;line-height:1.6;white-space:pre-wrap">${escapeHtml(pedido)}</p>
      </div>

      <p style="font-size:12px;color:#6B7280;line-height:1.6">
        La presentación de un reclamo no impide acudir a otras vías de solución.
        Más información en <a href="${SITE_URL}/libro-de-reclamaciones" style="color:#D92D20">${SITE_URL}/libro-de-reclamaciones</a>.
      </p>
    </div>`;

  const r1 = await sendBrevoHtml({
    to: email,
    toName: nombre,
    subject: `Tu ${etiqueta} ${codigo} — Libro de Reclamaciones de Apurape`,
    html: htmlConsumidor,
  });
  if (!r1.ok) console.error("[reclamaciones] constancia al consumidor no enviada:", r1.error);

  /* ── Aviso al administrador ── */
  const adminEmail = process.env.ADMIN_EMAIL || process.env.BREVO_SENDER_EMAIL;
  if (adminEmail) {
    const htmlAdmin = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;color:#1E293B">
        <h2 style="color:#B42318;margin:0 0 4px">Nuevo ${etiqueta}: ${codigo}</h2>
        <p style="color:#6B7280;font-size:13px;margin:0 0 16px">
          Presentado el ${fecha} · plazo de respuesta: 15 días hábiles
        </p>
        <table style="font-size:13px;border-collapse:collapse;width:100%">
          <tr><td style="padding:4px 8px 4px 0;color:#6B7280">Consumidor</td><td>${escapeHtml(nombre)}</td></tr>
          <tr><td style="padding:4px 8px 4px 0;color:#6B7280">Documento</td><td>${docTipo?.toUpperCase()} ${escapeHtml(documento)}</td></tr>
          <tr><td style="padding:4px 8px 4px 0;color:#6B7280">Correo</td><td>${escapeHtml(email)}</td></tr>
          ${body.telefono ? `<tr><td style="padding:4px 8px 4px 0;color:#6B7280">Teléfono</td><td>${escapeHtml(txt(body.telefono, 40))}</td></tr>` : ""}
          ${esMenor ? `<tr><td style="padding:4px 8px 4px 0;color:#6B7280">Menor de edad</td><td>Sí — apoderado: ${escapeHtml(apoderado)}</td></tr>` : ""}
          ${bien ? `<tr><td style="padding:4px 8px 4px 0;color:#6B7280">Bien</td><td>${bien}${monto ? ` · S/ ${monto}` : ""}</td></tr>` : ""}
        </table>
        <div style="background:#F9FAFB;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6B7280">DETALLE</p>
          <p style="margin:0;font-size:13px;line-height:1.6;white-space:pre-wrap">${escapeHtml(descripcion)}</p>
          <p style="margin:12px 0 6px;font-size:12px;font-weight:700;color:#6B7280">PEDIDO</p>
          <p style="margin:0;font-size:13px;line-height:1.6;white-space:pre-wrap">${escapeHtml(pedido)}</p>
        </div>
        <a href="${SITE_URL}/dashboard/admin/reclamaciones"
           style="display:inline-block;background:#D92D20;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700">
          Responder en el panel
        </a>
      </div>`;

    const r2 = await sendBrevoHtml({
      to: adminEmail,
      toName: "Apurape",
      subject: `[Libro de Reclamaciones] ${codigo} — ${etiqueta} de ${nombre}`,
      html: htmlAdmin,
      replyTo: email,
    });
    if (!r2.ok) console.error("[reclamaciones] aviso al admin no enviado:", r2.error);
  } else {
    console.error("[reclamaciones] Sin ADMIN_EMAIL ni BREVO_SENDER_EMAIL: nadie fue avisado de", codigo);
  }

  return NextResponse.json({ ok: true, codigo, fecha, emailEnviado: r1.ok });
}

/** El detalle lo escribe el consumidor y va dentro de un correo HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
