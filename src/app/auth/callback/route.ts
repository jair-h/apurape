import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Google OAuth callback (PKCE, cookie-based via @supabase/ssr).
 * - Exchanges the ?code for a session and writes the session cookies.
 * - New user (no profile / no role yet)  → /register/rol to choose a role.
 * - Existing user (profile with role)    → /dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError || !code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Collect any auth cookies Supabase sets during the exchange
  const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list) {
          list.forEach((c) => cookiesToSet.push(c as typeof cookiesToSet[number]));
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Does this user already have a role assigned?
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", data.session.user.id)
    .maybeSingle();

  const destination = profile?.role ? "/dashboard" : "/register/rol";

  const response = NextResponse.redirect(`${origin}${destination}`);
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
