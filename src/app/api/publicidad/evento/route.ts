import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Registrar una impresión o un clic de un anuncio.
 *
 * Body: { promotion_id, kind: 'impresion'|'clic', viewer_hash, placement? }
 *
 * Va por service-role porque ad_record_event está revocada para anon: así no
 * se pueden inflar vistas/clics a mano desde el navegador saltándose la lógica.
 * La deduplicación (un visitante por día) la garantiza la propia tabla, y el
 * clic NO gasta presupuesto (modelo CPM: se paga la vista).
 */

export async function POST(request: NextRequest) {
  let body: { promotion_id?: string; kind?: string; viewer_hash?: string; placement?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { promotion_id, kind, viewer_hash, placement } = body;
  if (!promotion_id || (kind !== "impresion" && kind !== "clic")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // Sin service key no se puede contar; no es un error visible para el usuario.
    return NextResponse.json({ ok: true, counted: false });
  }

  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.rpc("ad_record_event", {
    p_promotion_id: promotion_id,
    p_kind: kind,
    p_viewer_hash: String(viewer_hash ?? "anon").slice(0, 64),
    p_placement: placement ?? null,
  });

  if (error) {
    console.error("[publicidad] evento no registrado:", error.message);
    return NextResponse.json({ ok: true, counted: false });
  }

  return NextResponse.json({ ok: true, counted: data === true });
}
