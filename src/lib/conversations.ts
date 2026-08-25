import { createClient } from "@/lib/supabase";

/**
 * Finds an existing conversation between two users, or creates one.
 * Returns the conversation id, or null on error.
 */
export async function findOrCreateConversation(
  myId: string,
  otherId: string,
  productId?: string | null,
  productType?: string | null,
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
      participant_1:    myId,
      participant_2:    otherId,
      product_id:       productId   ?? null,
      product_type:     productType ?? null,
      unread_count_p1:  0,
      unread_count_p2:  0,
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}
