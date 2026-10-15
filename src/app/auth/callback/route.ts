import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { safeNextPath } from "@/lib/utils/redirects";

/** Supabase magic-link / OAuth callback: exchanges the code for a session cookie. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"), env.appUrl);
  if (!env.supabaseConfigured || !code) return NextResponse.redirect(new URL("/login", env.appUrl));
  const { createSupabaseServerClient } = await import("@/lib/auth/supabase");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=link", env.appUrl));
  return NextResponse.redirect(new URL(next, env.appUrl));
}
