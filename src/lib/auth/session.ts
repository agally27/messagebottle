import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";
import { getStore } from "@/lib/data";
import type { UserProfile } from "@/lib/domain/types";
import { hmacSign, hmacVerify, newId, nowIso } from "@/lib/utils/ids";

const COOKIE = "mib_session";
const MAX_AGE_S = 60 * 60 * 24 * 90; // 90 days

let secretPromise: Promise<string> | null = null;

/**
 * Session signing secret. Required in production. In development it is
 * generated once and kept in the local data directory so sessions survive
 * restarts.
 */
export async function getSessionSecret(): Promise<string> {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (env.isProduction) {
    throw new Error("SESSION_SECRET is required in production. Generate one with: openssl rand -hex 32");
  }
  if (!secretPromise) {
    secretPromise = (async () => {
      const file = path.resolve(/* turbopackIgnore: true */ process.cwd(), env.LOCAL_DATA_DIR, "session-secret");
      try {
        const existing = (await readFile(file, "utf8")).trim();
        if (existing.length >= 32) return existing;
      } catch {
        /* create below */
      }
      const generated = randomBytes(32).toString("hex");
      try {
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, generated, { encoding: "utf8", mode: 0o600 });
      } catch {
        console.warn("[auth] could not persist a development session secret; sessions will reset on restart");
      }
      return generated;
    })();
  }
  return secretPromise;
}

interface DemoSessionPayload {
  uid: string;
  iat: number;
}

function encode(payload: DemoSessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmacSign(secret, body)}`;
}

function decode(value: string, secret: string): DemoSessionPayload | null {
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  if (!hmacVerify(secret, body, sig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DemoSessionPayload;
    if (typeof parsed.uid !== "string" || typeof parsed.iat !== "number") return null;
    if (Date.now() / 1000 - parsed.iat > MAX_AGE_S) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Demo sessions are only available when Supabase Auth is not configured. */
export function demoAuthEnabled(): boolean {
  return !env.supabaseConfigured;
}

async function readDemoSession(): Promise<DemoSessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  return decode(raw, await getSessionSecret());
}

/** Current user, or null. Works for both Supabase and demo sessions. */
export async function getCurrentUser(): Promise<UserProfile | null> {
  if (env.supabaseConfigured) {
    const { getSupabaseUser } = await import("./supabase");
    return getSupabaseUser();
  }
  const session = await readDemoSession();
  if (!session) return null;
  return getStore().users.get(session.uid);
}

/**
 * Creates a demo account and signs the caller in. Only callable from a Server
 * Action or Route Handler (cookies can be set there).
 */
export async function signInDemoUser(displayName: string): Promise<UserProfile> {
  if (!demoAuthEnabled()) throw new Error("Demo sign-in is disabled when Supabase Auth is configured.");
  const store = getStore();
  const existing = await readDemoSession();
  if (existing) {
    const user = await store.users.get(existing.uid);
    if (user) {
      if (displayName && displayName !== user.displayName) {
        return store.users.upsert({ ...user, displayName, updatedAt: nowIso() });
      }
      return user;
    }
  }
  const now = nowIso();
  const user: UserProfile = {
    id: newId(),
    email: null,
    displayName: displayName || "Guest",
    isAdmin: false,
    kind: "demo",
    createdAt: now,
    updatedAt: now,
  };
  await store.users.upsert(user);
  const jar = await cookies();
  jar.set(COOKIE, encode({ uid: user.id, iat: Math.floor(Date.now() / 1000) }, await getSessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: MAX_AGE_S,
  });
  return user;
}

export async function signOut(): Promise<void> {
  if (env.supabaseConfigured) {
    const { supabaseSignOut } = await import("./supabase");
    await supabaseSignOut();
    return;
  }
  const jar = await cookies();
  jar.delete(COOKIE);
}
