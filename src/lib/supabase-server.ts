import { createClient } from "@supabase/supabase-js";

/**
 * Read-only Supabase client for Server Components.
 * Uses the anon key — RLS "Public read published" allows reading published blog posts.
 * No session/cookies needed for public data.
 */
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
