"use server";

import { redirect } from "next/navigation";
import { demoAuthEnabled, signInDemoUser, signOut } from "@/lib/auth/session";
import { env } from "@/lib/config/env";

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function demoSignInAction(formData: FormData): Promise<void> {
  if (!demoAuthEnabled()) redirect("/login");
  const name = String(formData.get("name") ?? "").trim().slice(0, 40) || "Guest";
  await signInDemoUser(name);
  redirect(safeNext(formData.get("next")));
}

export async function magicLinkAction(_prev: { ok: boolean; message: string } | null, formData: FormData): Promise<{ ok: boolean; message: string }> {
  if (!env.supabaseConfigured) return { ok: false, message: "Email sign-in is not configured." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Enter a valid email address." };
  const next = safeNext(formData.get("next"));
  const { createSupabaseServerClient } = await import("@/lib/auth/supabase");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${env.appUrl}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (error) {
    console.warn("[auth] magic link failed", error.message);
    return { ok: false, message: "We couldn't send the link just now. Please try again in a moment." };
  }
  return { ok: true, message: "Check your email for a sign-in link. It expires in an hour." };
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/");
}
