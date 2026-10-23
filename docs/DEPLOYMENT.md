# Deployment: Vercel + Supabase

**Hosting:** Vercel (Next.js). **Database, auth, storage:** Supabase. Neon was considered but the app already uses Supabase Auth, Storage and RLS; Neon would mean replacing auth (see docs/DECISIONS.md #13).

Nothing has been deployed by the build sessions: their network blocks vercel.com and supabase.com. Everything below was prepared and checked locally (`pnpm check`, `pnpm test:e2e`, `pnpm test:supabase`).

## 1. Supabase (about 10 minutes)
1. Create a project at supabase.com (region: London `eu-west-2` for UK customers).
2. **SQL Editor → New query**: paste all of `supabase/migrations/0001_init.sql` and run it, then do the same with `0002_photos.sql` (gift photos) `0003_scheduled_deliveries.sql` (scheduled email delivery) `0004_open_notifications.sql` ("opened" email) and `0005_gift_replies.sql` (replies), in order. All are safe to run again. **Existing projects:** run each new migration before deploying the release that needs it: `0002` before Memory in a Bottle (or saving gifts fails), `0003` before scheduled delivery (or the gift page fails to load), `0004` before the opened notification (or opening a gift can't be recorded as notified), `0005` before replies (or the gift page and My gifts fail to load). Photos are stored in the private `gift-assets` bucket that 0001 creates.
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
| `PHYSICAL_PRODUCTS` | leave unset (or `off`) to sell only the digital gift; `on` once keepsake bottles can be made and posted. Redeploy after changing it. |
| `NEXT_PUBLIC_APP_URL` | optional; defaults to the Vercel production domain. Set it when you add a custom domain. |

Alternatively install the **Supabase integration** from the Vercel Marketplace: it sets `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, which the app also accepts.

4. Deploy. Then open `/api/health` (should return `{"ok":true}`), sign in with your admin email, and visit `/admin` to see which integrations are live.

Optional, any time later: `ANTHROPIC_API_KEY` (AI-written stories), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` with a webhook to `https://<app>/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.expired`, `charge.refunded` (then set `DEMO_MODE=false`), `RESEND_API_KEY` + `EMAIL_FROM` (gift emails).

## Background jobs and crons
Generation runs right after the request that starts it (`after()`), and the generation screen re-kicks anything stalled. `vercel.json` adds two **daily** crons, which the Hobby plan allows:
- `/api/jobs/run` at **07:00 UTC**: generation safety net, and **sends scheduled deliveries** due that day. Hobby runs it some time in the 07:00–08:00 UTC hour, so recipients get scheduled emails by 9am UK time all year. On Pro, run it every few minutes and deliveries go out right at 07:00 UTC.
- `/api/jobs/run?sweep=1` at 03:43 UTC: draft retention sweep.

Scheduled delivery needs email (`RESEND_API_KEY`, `EMAIL_FROM` on a verified domain) and `CRON_SECRET`. Without email, the gift page says email isn't set up and the link can still be copied.

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
