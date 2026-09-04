import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { sendBrevoTemplate, formatDateLima, LOGIN_URL } from "@/lib/brevo";

export const dynamic = "force-dynamic";

/**
 * Correo al ganador del concurso mensual.
 *
 * Corre después del cierre que hace pg_cron el día 3. La base ya marcó al
 * ganador y creó el aviso dentro de la app; aquí solo se envía el correo
 * de los que tienen winner_email_sent_at nulo.
 *
 * Está separado del cierre a propósito: mandarlo desde Postgres obligaría
 * a guardar la API key de Brevo dentro de la base. Así la key se queda en
 * las variables de entorno, y si el correo falla el concurso ya quedó
 * cerrado igual — se reintenta en la siguiente corrida.
 *
 * Requiere SUPABASE_SERVICE_ROLE_KEY y BREVO_WINNER_TEMPLATE_ID.
 * Programado en vercel.json.
 */

const MES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

interface RaffleRow {
  id: string;
  period: string;
  audience: string;
  prize_description: string | null;
  winner_profile_id: string;
  service_categories: { name: string } | null;
  profiles: { name: string | null; business_name: string | null } | null;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("[winner-emails] Falta SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ ok: false, error: "Cron no configurado." }, { status: 500 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("raffles")
    .select("id, period, audience, prize_description, winner_profile_id, service_categories(name), profiles!raffles_winner_profile_id_fkey(name, business_name)")
    .eq("status", "premiado")
    .not("winner_profile_id", "is", null)
    .is("winner_email_sent_at", null);

  if (error) {
    console.error("[winner-emails] error leyendo concursos:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const pendientes = (data ?? []) as unknown as RaffleRow[];
  const templateId = Number(process.env.BREVO_WINNER_TEMPLATE_ID);

  // Sin plantilla no se envía nada, pero tampoco se marca como enviado:
  // cuando la variable exista, la siguiente corrida los recoge.
  if (!templateId || Number.isNaN(templateId)) {
    console.warn("[winner-emails] Falta BREVO_WINNER_TEMPLATE_ID; se omite el envío de",
      pendientes.length, "correos. El aviso dentro de la app ya se creó.");
    return NextResponse.json({ ok: true, pending: pendientes.length, sent: 0, skipped: "sin plantilla" });
  }

  let enviados = 0;

  for (const r of pendientes) {
    let email = "";
    try {
      const { data: u } = await supabase.auth.admin.getUserById(r.winner_profile_id);
      email = u.user?.email ?? "";
    } catch (e) {
      console.error("[winner-emails] sin email para", r.winner_profile_id, e);
    }
    if (!email) continue;

    const nombre = r.profiles?.business_name?.trim() || r.profiles?.name?.trim() || "Ganador";
    const mes = MES_ES[Number(r.period.split("-")[1]) - 1] ?? "";
    const categoria = r.service_categories?.name ?? "tu categoría";

    const result = await sendBrevoTemplate({
      to: email,
      toName: nombre,
      templateId,
      params: {
        NOMBRE: nombre,
        MES: mes,
        CATEGORIA: r.audience === "proveedor" ? categoria : "Clientes",
        PREMIO: r.prize_description ?? "Te contactaremos para coordinar el premio.",
        FECHA: formatDateLima(new Date()),
        LOGIN_URL,
      },
    });

    if (result.ok) {
      await supabase.from("raffles")
        .update({ winner_email_sent_at: new Date().toISOString() })
        .eq("id", r.id);
      enviados++;
    } else {
      // No se marca: se reintenta en la siguiente corrida.
      console.error("[winner-emails] fallo el envío a", email, result.error);
    }
  }

  return NextResponse.json({ ok: true, pending: pendientes.length, sent: enviados });
}
