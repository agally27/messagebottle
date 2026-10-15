import "server-only";
import { z } from "zod";

/**
 * The only place secrets are read. Everything is optional so the app always
 * starts; feature flags below say what is actually configured.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(16).optional(),
  DEMO_MODE: z.enum(["true", "false"]).default("false"),
  // Demo mode only: a guest who supplies this secret on the login page becomes an admin.
  DEMO_ADMIN_SECRET: z.string().min(8).optional(),

  DATA_BACKEND: z.enum(["auto", "supabase", "local", "memory"]).default("auto"),
  LOCAL_DATA_DIR: z.string().default(".data"),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("gift-assets"),

  STORY_PROVIDER: z.enum(["auto", "anthropic", "local"]).default("auto"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5-5"),
  IMAGE_PROVIDER: z.enum(["procedural", "openai"]).default("procedural"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-1"),
  MUSIC_PROVIDER: z.enum(["procedural"]).default("procedural"),
  NARRATION_PROVIDER: z.enum(["none", "elevenlabs"]).default("none"),
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_VOICE_ID: z.string().min(1).optional(),

  GENERATION_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(5),
  DEMO_STEP_DELAY_MS: z.coerce.number().int().min(0).max(10_000).default(900),
  JOBS_SECRET: z.string().min(16).optional(),
  DRAFT_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(90),

  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),

  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().default("Message in a Bottle <hello@example.com>"),

  ADMIN_EMAILS: z.string().default(""),
});

function emptyToUndefined(input: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(input)) out[k] = v === "" ? undefined : v;
  return out;
}

const parsed = schema.safeParse(emptyToUndefined(process.env));
if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

const raw = parsed.data;

const supabaseConfigured = Boolean(raw.NEXT_PUBLIC_SUPABASE_URL && raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const dataBackend: "supabase" | "local" | "memory" =
  raw.DATA_BACKEND === "auto" ? (supabaseConfigured ? "supabase" : "local") : raw.DATA_BACKEND;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  demoMode: raw.DEMO_MODE === "true",
  appUrl: raw.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""),
  dataBackend,
  supabaseConfigured,
  supabaseServiceConfigured: supabaseConfigured && Boolean(raw.SUPABASE_SECRET_KEY),
  stripeConfigured: Boolean(raw.STRIPE_SECRET_KEY && raw.STRIPE_WEBHOOK_SECRET),
  emailConfigured: Boolean(raw.RESEND_API_KEY),
  storyProvider: raw.STORY_PROVIDER === "auto" ? (raw.ANTHROPIC_API_KEY ? "anthropic" : "local") : raw.STORY_PROVIDER,
  imageProvider: raw.IMAGE_PROVIDER === "openai" && raw.OPENAI_API_KEY ? "openai" : "procedural",
  narrationProvider: raw.NARRATION_PROVIDER === "elevenlabs" && raw.ELEVENLABS_API_KEY ? "elevenlabs" : "none",
  adminEmails: raw.ADMIN_EMAILS.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
} as const;

export type Env = typeof env;

/** Summary safe to show to admins and in health checks: booleans only. */
export function configurationSummary() {
  return {
    dataBackend: env.dataBackend,
    demoMode: env.demoMode,
    supabase: env.supabaseConfigured,
    supabaseService: env.supabaseServiceConfigured,
    stripe: env.stripeConfigured,
    email: env.emailConfigured,
    storyProvider: env.storyProvider,
    imageProvider: env.imageProvider,
    narrationProvider: env.narrationProvider,
    musicProvider: env.MUSIC_PROVIDER,
    sessionSecret: Boolean(env.SESSION_SECRET),
    jobsSecret: Boolean(env.JOBS_SECRET),
  };
}
