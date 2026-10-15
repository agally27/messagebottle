import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";
import { getStore } from "@/lib/data";
import type { UserProfile } from "@/lib/domain/types";
import { nowIso } from "@/lib/utils/ids";

/** Request-scoped Supabase client that reads/writes the auth cookies. */
export async function createSupabaseServerClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase is not configured");
  }
  const jar = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; proxy.ts refreshes sessions instead.
        }
      },
    },
  });
}

/** Maps the Supabase auth user to our profile, creating/refreshing the profile row. */
export async function getSupabaseUser(): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const store = getStore();
  const email = data.user.email?.toLowerCase() ?? null;
  const existing = await store.users.get(data.user.id);
  const isAdmin = Boolean(email && env.adminEmails.includes(email));
  if (existing && existing.email === email && existing.isAdmin === isAdmin) return existing;
  const now = nowIso();
  return store.users.upsert({
    id: data.user.id,
    email,
    displayName: existing?.displayName ?? (data.user.user_metadata?.display_name as string | undefined) ?? null,
    isAdmin,
    kind: "supabase",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

export async function supabaseSignOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
