import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/** Keep-alive endpoint: a light DB read so Supabase (free tier) doesn't pause
 *  for inactivity. Called by a Vercel Cron every 4 days (see vercel.json). */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { error } = await supabase.from("blog_posts").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown error" },
      { status: 500 },
    );
  }
}
