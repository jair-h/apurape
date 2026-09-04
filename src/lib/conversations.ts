import { createClient } from "@/lib/supabase";

interface Opciones {
  /** De dónde nació la conversación: un servicio publicado o una solicitud. */
  subjectId?: string | null;
  subjectType?: "service" | "request" | null;
  /**
   * Quién es el Proveedor en esta conversación.
   *
   * Importante: sin esto la conversación no se puede medir para el
   * componente de velocidad del Índice de Excelencia. participant_1 y
   * participant_2 son simétricos y con el rol dual ambos pueden ser
   * proveedor, así que la base no tiene forma de deducirlo sola. Se pasa
   * desde donde sí se sabe: el dueño del servicio o quien responde a una
   * solicitud.
   */
  providerId?: string | null;
}

/**
 * Finds an existing conversation between two users, or creates one.
 * Returns the conversation id, or null on error.
 */
export async function findOrCreateConversation(
  myId: string,
  otherId: string,
  opciones: Opciones = {},
): Promise<string | null> {
  if (!myId || !otherId || myId === otherId) return null;

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("conversations")
    .select("id, provider_id")
    .or(
      `and(participant_1.eq.${myId},participant_2.eq.${otherId}),and(participant_1.eq.${otherId},participant_2.eq.${myId})`
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Una conversación creada antes de saber quién era el proveedor puede
    // completarse ahora; nunca se sobrescribe si ya tenía uno.
    if (!existing.provider_id && opciones.providerId) {
      await supabase.from("conversations")
        .update({ provider_id: opciones.providerId })
        .eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      participant_1:   myId,
      participant_2:   otherId,
      subject_id:      opciones.subjectId   ?? null,
      subject_type:    opciones.subjectType ?? null,
      provider_id:     opciones.providerId  ?? null,
      unread_count_p1: 0,
      unread_count_p2: 0,
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}
