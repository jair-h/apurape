import { createClient } from "@/lib/supabase";

/**
 * Finds an existing conversation between two users, or creates one.
 * Returns the conversation id, or null on error.
 *
 * `subject` es de dónde nació la conversación: un servicio publicado por el
 * proveedor o una solicitud publicada por el cliente. (En Apurape esto se
 * llamaba product_id / product_type y apuntaba a productos agro.)
 */
export async function findOrCreateConversation(
  myId: string,
  otherId: string,
  subjectId?: string | null,
  subjectType?: "service" | "request" | null,
): Promise<string | null> {
  if (!myId || !otherId || myId === otherId) return null;

  const supabase = createClient();

  // Look for any existing conversation between the two users
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant_1.eq.${myId},participant_2.eq.${otherId}),and(participant_1.eq.${otherId},participant_2.eq.${myId})`
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  // Create new conversation
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      participant_1:   myId,
      participant_2:   otherId,
      subject_id:      subjectId   ?? null,
      subject_type:    subjectType ?? null,
      unread_count_p1: 0,
      unread_count_p2: 0,
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}
