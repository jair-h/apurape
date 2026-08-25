/**
 * Integración centralizada con Brevo (email transaccional).
 *
 * Regla de oro de MARKARU: NO dependemos de contactos/atributos de Brevo.
 * Todas las variables dinámicas viajan como `params` en cada envío.
 * Las plantillas se administran manualmente en Brevo — el código solo manda templateId + params.
 *
 * Variables privadas de Vercel (server-only, nunca NEXT_PUBLIC):
 *   - BREVO_API_KEY
 *   - BREVO_WELCOME_TEMPLATE_ID
 *   - BREVO_PAYMENT_TEMPLATE_ID
 *   - BREVO_TRIAL_TEMPLATE_ID
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.markaru.com";
export const LOGIN_URL = `${SITE_URL}/dashboard`;

/* Rol → etiqueta en español (param ROL) */
export const ROL_ES: Record<string, string> = {
  productor: "Productor",
  exportador: "Exportador",
  comprador: "Comprador",
  forwarder: "Forwarder",
  certificadora: "Certificadora",
};

/* Rol → texto de la acción siguiente sugerida (param ACCION_SIGUIENTE del welcome) */
export const ACCION_SIGUIENTE: Record<string, string> = {
  productor: "Publica tus productos y completa tu oferta para que compradores y exportadores puedan encontrarte.",
  exportador: "Publica tu oferta exportable y empieza a conectar con compradores internacionales.",
  comprador: "Explora proveedores y publica tus requerimientos para recibir propuestas.",
  forwarder: "Completa tus servicios y cobertura logística para empezar a recibir oportunidades.",
  certificadora: "Completa tus certificaciones y servicios para que productores y exportadores puedan encontrarte.",
};
export const ACCION_SIGUIENTE_DEFAULT =
  "Completa tu perfil para aprovechar al máximo MARKARU y conectar con la comunidad agroexportadora.";

/* Rol → plan de entrada (para construir PRECIO y el link de checkout del email de trial) */
export const DEFAULT_PLAN: Record<string, string> = {
  productor: "productor",
  exportador: "basic",
  forwarder: "basic",
  certificadora: "basic",
};

export function rolLabel(rol?: string | null): string {
  return (rol && ROL_ES[rol]) || "Usuario";
}

export function accionSiguiente(rol?: string | null): string {
  return (rol && ACCION_SIGUIENTE[rol]) || ACCION_SIGUIENTE_DEFAULT;
}

/** URL absoluta y real de checkout de MARKARU para un rol/plan. Nunca vacía. */
export function checkoutUrl(rol: string, planKey?: string): string {
  return planKey
    ? `${SITE_URL}/activar-plan?rol=${encodeURIComponent(rol)}&plan=${encodeURIComponent(planKey)}`
    : `${SITE_URL}/planes`;
}

/** Fecha en formato DD/MM/YYYY, zona horaria de Lima (Perú). */
export function formatDateLima(d: Date): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Devuelve la lista de params obligatorios que faltan (vacíos, null o undefined). */
export function missingParams(params: Record<string, unknown>, required: string[]): string[] {
  return required.filter((k) => {
    const v = params[k];
    return v === undefined || v === null || String(v).trim() === "";
  });
}

export interface SendBrevoResult {
  ok: boolean;
  brevoStatus: number;
  messageId: string | null;
  error: string | null;
}

/**
 * Envío genérico de una plantilla de Brevo.
 * - Lee BREVO_API_KEY del entorno (nunca se expone ni se loguea).
 * - Manda templateId + params en application/json.
 * - Devuelve brevoStatus, messageId y error (si existe).
 */
export async function sendBrevoTemplate({
  to,
  toName,
  templateId,
  params,
}: {
  to: string;
  toName?: string;
  templateId: number;
  params: Record<string, unknown>;
}): Promise<SendBrevoResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("[brevo] Sin API key");
    return { ok: false, brevoStatus: 0, messageId: null, error: "Falta BREVO_API_KEY" };
  }
  if (!templateId || Number.isNaN(templateId)) {
    console.error("[brevo] Sin templateId válido");
    return { ok: false, brevoStatus: 0, messageId: null, error: "Falta templateId" };
  }

  // Logs útiles — nunca la API key.
  console.log("[brevo] templateId:", templateId);
  console.log("[brevo] recipient:", to);
  console.log("[brevo] params:", JSON.stringify(params));

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        to: [{ email: to, name: toName || to }],
        templateId,
        params,
      }),
    });

    const text = await res.text();
    let messageId: string | null = null;
    try { messageId = (JSON.parse(text) as { messageId?: string })?.messageId ?? null; } catch { /* respuesta no-JSON */ }

    console.log("[brevo] status:", res.status);
    console.log("[brevo] messageId:", messageId);

    if (!res.ok) {
      console.error("[brevo] error:", res.status, text);
      return { ok: false, brevoStatus: res.status, messageId, error: text };
    }
    return { ok: true, brevoStatus: res.status, messageId, error: null };
  } catch (e) {
    const error = e instanceof Error ? e.message : "error desconocido";
    console.error("[brevo] exception:", error);
    return { ok: false, brevoStatus: 0, messageId: null, error };
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 * CONTACTOS (CRM) — sincronización de usuarios de MARKARU con contactos de Brevo.
 *
 * Supabase/MARKARU es la ÚNICA fuente de verdad de usuarios. Brevo es solo para
 * CRM/segmentación/campañas. Crear/actualizar el contacto NO implica consentimiento
 * de marketing: NO se añade a ninguna lista (no se envía `listIds`), así que el
 * contacto queda fuera de campañas hasta que exista un opt-in explícito.
 *
 * Atributos en Brevo (Contacts → Settings → Attributes):
 *   NOMBRE (Text, estándar de la cuenta), APELLIDOS (Text, estándar de la cuenta),
 *   EMPRESA (Text), PAIS (Text), ROL_MARKARU (Text), PLAN_MARKARU (Text),
 *   ESTADO_PLAN (Text), IDIOMA (Text),
 *   FECHA_REGISTRO (Date), FECHA_FIN_TRIAL (Date), FECHA_VENCIMIENTO (Date)
 * Si un atributo no existe todavía en Brevo, se OMITE (y se loguea) — nunca rompe el upsert.
 * ══════════════════════════════════════════════════════════════════════════ */

const CONTACTS_ENDPOINT = "https://api.brevo.com/v3/contacts";
const ATTRS_ENDPOINT = "https://api.brevo.com/v3/contacts/attributes";
const ATTRS_TTL_MS = 10 * 60 * 1000;

let _attrCache: { names: Set<string>; at: number } | null = null;

/** Nombres de atributos que existen en la cuenta de Brevo (mayúsculas). null si no se pudo leer. */
async function getBrevoAttributeNames(apiKey: string): Promise<Set<string> | null> {
  if (_attrCache && Date.now() - _attrCache.at < ATTRS_TTL_MS) return _attrCache.names;
  try {
    const res = await fetch(ATTRS_ENDPOINT, { headers: { "api-key": apiKey, accept: "application/json" } });
    if (!res.ok) {
      console.error("[brevo-contact] no se pudieron leer atributos:", res.status);
      return null;
    }
    const json = (await res.json()) as { attributes?: { name?: string }[] };
    const names = new Set<string>((json.attributes ?? []).map((a) => String(a.name ?? "").toUpperCase()));
    _attrCache = { names, at: Date.now() };
    return names;
  } catch (e) {
    console.error("[brevo-contact] error leyendo atributos:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Convierte un valor a fecha ISO corta YYYY-MM-DD (formato de atributos Date de Brevo). */
function toISODate(v?: string | Date | null): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Divide un nombre completo en { nombre, apellido }. */
export function splitFullName(full?: string | null): { nombre: string; apellido: string } {
  const parts = String(full ?? "").trim().split(/\s+/).filter(Boolean);
  return { nombre: parts[0] ?? "", apellido: parts.slice(1).join(" ") };
}

export interface SyncContactInput {
  email: string;
  nombre?: string | null;
  apellido?: string | null;
  empresa?: string | null;
  pais?: string | null;
  rol?: string | null;
  plan?: string | null;
  estadoPlan?: string | null;
  fechaRegistro?: string | Date | null;
  fechaFinTrial?: string | Date | null;
  fechaVencimiento?: string | Date | null;
  idioma?: string | null;
}

export interface SyncContactResult {
  ok: boolean;
  action: "create" | "update" | "skip";
  status: number;
  error: string | null;
  skippedAttrs: string[];
}

/**
 * UPSERT de un contacto en Brevo por email (sin duplicados).
 * - Solo se envían atributos con valor y que EXISTEN en Brevo (los faltantes se omiten y loguean).
 * - `updateEnabled: true`: crea si no existe (201), actualiza si existe (204).
 * - Como solo se mandan los atributos provistos, un sync parcial no borra los demás.
 * - No añade el contacto a ninguna lista de marketing.
 */
export async function syncBrevoContact(input: SyncContactInput): Promise<SyncContactResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("[brevo-contact] Sin API key");
    return { ok: false, action: "skip", status: 0, error: "Falta BREVO_API_KEY", skippedAttrs: [] };
  }
  if (!input.email) {
    console.error("[brevo-contact] Sin email");
    return { ok: false, action: "skip", status: 0, error: "Falta email", skippedAttrs: [] };
  }

  const existing = await getBrevoAttributeNames(apiKey);
  // Atributos estándar de nombre en esta cuenta de Brevo: NOMBRE / APELLIDOS (no FIRSTNAME/LASTNAME).
  const DEFAULT_ATTRS = new Set(["NOMBRE", "APELLIDOS"]);

  const wanted: Record<string, string> = {};
  const put = (k: string, v?: string | null) => { if (v != null && String(v).trim() !== "") wanted[k] = String(v).trim(); };
  const putDate = (k: string, v?: string | Date | null) => { const d = toISODate(v); if (d) wanted[k] = d; };

  put("NOMBRE", input.nombre);
  put("APELLIDOS", input.apellido);
  put("EMPRESA", input.empresa);
  put("PAIS", input.pais);
  put("ROL_MARKARU", input.rol);
  put("PLAN_MARKARU", input.plan);
  put("ESTADO_PLAN", input.estadoPlan);
  put("IDIOMA", input.idioma);
  putDate("FECHA_REGISTRO", input.fechaRegistro);
  putDate("FECHA_FIN_TRIAL", input.fechaFinTrial);
  putDate("FECHA_VENCIMIENTO", input.fechaVencimiento);

  const attributes: Record<string, string> = {};
  const skipped: string[] = [];
  for (const [k, v] of Object.entries(wanted)) {
    const exists = existing ? existing.has(k) : DEFAULT_ATTRS.has(k);
    if (exists) attributes[k] = v; else skipped.push(k);
  }
  if (skipped.length) console.warn("[brevo-contact] atributos no definidos en Brevo (omitidos):", skipped.join(", "));

  try {
    const res = await fetch(CONTACTS_ENDPOINT, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email: input.email, attributes, updateEnabled: true }),
    });
    const action: SyncContactResult["action"] = res.status === 201 ? "create" : "update";
    console.log("[brevo-contact] action=" + action);
    console.log("[brevo-contact] email:", input.email);
    console.log("[brevo-contact] status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error("[brevo-contact] error:", res.status, text);
      return { ok: false, action, status: res.status, error: text, skippedAttrs: skipped };
    }
    return { ok: true, action, status: res.status, error: null, skippedAttrs: skipped };
  } catch (e) {
    const error = e instanceof Error ? e.message : "error desconocido";
    console.error("[brevo-contact] error:", error);
    return { ok: false, action: "skip", status: 0, error, skippedAttrs: skipped };
  }
}
