# Deployment: Vercel + Supabase

**Hosting:** Vercel (Next.js). **Database, auth, storage:** Supabase. Neon was considered but the app already uses Supabase Auth, Storage and RLS; Neon would mean replacing auth (see docs/DECISIONS.md #13).

Nothing has been deployed by the build sessions: their network blocks vercel.com and supabase.com. Everything below was prepared and checked locally (`pnpm check`, `pnpm test:e2e`, `pnpm test:supabase`).

## 1. Supabase (about 10 minutes)
1. Create a project at supabase.com (region: London `eu-west-2` for UK customers).
2. **SQL Editor → New query**: paste all of `supabase/migrations/0001_init.sql` and run it, then do the same with `0002_photos.sql` (adds the gift photos column). Both are safe to run again. **Existing projects:** run `0002_photos.sql` before deploying the Memory in a Bottle release, or saving gifts will fail. Photos are stored in the private `gift-assets` bucket that 0001 creates.
3. **Authentication → URL Configuration**: set **Site URL** to your Vercel URL (e.g. `https://messagebottle.vercel.app`) and add `https://messagebottle.vercel.app/auth/callback` (and `https://*-<your-team>.vercel.app/auth/callback` for previews) to **Redirect URLs**.
4. **Authentication → Providers → Email**: enabled (magic links). Supabase's built-in email sender is heavily rate-limited (a few emails an hour) — fine for testing; add custom SMTP (e.g. Resend) under **Authentication → Emails → SMTP Settings** before real customers.
5. **Project Settings → API**: note the project URL, the publishable (anon) key and the secret (service role) key.

## 2. Vercel (about 5 minutes)
1. **Add New → Project → Import** `agally27/messagebottle`. Framework: Next.js (auto-detected). Root directory: repository root. Build and install commands: defaults (pnpm is detected from `packageManager`).
2. Production branch: `main` (make sure it is the repository's default branch under GitHub → Settings → General → Default branch).
3. **Environment Variables** (Production and Preview):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable / anon key |
| `SUPABASE_SECRET_KEY` | secret / service-role key (**server only**) |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `CRON_SECRET` | `openssl rand -hex 32` (also used as `JOBS_SECRET`) |
| `ADMIN_EMAILS` | your email, for `/admin` |
| `DEMO_MODE` | `true` while Stripe is not configured (labelled demo checkout); `false` once it is |
| `NEXT_PUBLIC_APP_URL` | optional; defaults to the Vercel production domain. Set it when you add a custom domain. |

Alternatively install the **Supabase integration** from the Vercel Marketplace: it sets `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, which the app also accepts.

4. Deploy. Then open `/api/health` (should return `{"ok":true}`), sign in with your admin email, and visit `/admin` to see which integrations are live.

Optional, any time later: `ANTHROPIC_API_KEY` (AI-written stories), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` with a webhook to `https://<app>/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.expired`, `charge.refunded` (then set `DEMO_MODE=false`), `RESEND_API_KEY` + `EMAIL_FROM` (gift emails).

## Background jobs and crons
Generation runs right after the request that starts it (`after()`), and the generation screen re-kicks anything stalled. `vercel.json` adds two **daily** crons (job safety net, draft retention sweep), which the Hobby plan allows. On Pro you can make the job cron every few minutes.

## Must be true in production
- Supabase configured. Without it the app falls back to a local file store, which on Vercel is per-instance and loses data. The server logs a warning if this happens.
- `SESSION_SECRET` set.
- Never `DEMO_MODE=true` together with live Stripe keys (demo checkout is disabled automatically when Stripe keys exist, but keep them consistent).

## Verify locally before changing the schema
```
pnpm check          # typecheck, lint, unit tests, build
pnpm test:e2e       # Playwright journeys + accessibility (demo mode)
pnpm test:supabase  # migration + SupabaseStore against local Postgres 16 + PostgREST
```

## Mobile and other hosts
Any Node host works: `pnpm build && pnpm start` with the same variables.
