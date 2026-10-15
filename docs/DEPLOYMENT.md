# Deployment

Nothing has been deployed yet. This is the prepared path.

## Environments
| Mode | What you need | What you get |
| --- | --- | --- |
| Demo (default) | nothing | local JSON store, guest sessions, local story writer, procedural art and music, demo checkout |
| Staging | Supabase project, Stripe **test** keys, `SESSION_SECRET`, `JOBS_SECRET` | real accounts, Postgres with RLS, test-mode payments |
| Production | the above with live keys, `DEMO_MODE=false`, real AI providers as desired | the real thing |

Copy `.env.example` → `.env.local` for development. Variable names are the documentation; never commit values.

Demo mode specifics: guest sessions are created on demand; `/admin` is reachable by entering `DEMO_ADMIN_SECRET` under "Operator sign-in" on the login page; demo checkout and demo activation exist only while Stripe keys are absent. Abandoned drafts are swept by `POST /api/jobs/run?sweep=1`.

## Vercel
1. Import the repository. Framework preset: Next.js. Build `pnpm build`, install `pnpm install --frozen-lockfile`.
2. Add environment variables (Settings → Environment Variables). Required for a non-demo deploy: `NEXT_PUBLIC_APP_URL`, `SESSION_SECRET`, `DEMO_MODE=false`, the Supabase variables, Stripe variables, `JOBS_SECRET`.
3. Background jobs run via `after()` on the request that starts them; the generation screen's poll re-kicks stale jobs. `vercel.json` also schedules `/api/jobs/run` every five minutes and a nightly retention sweep. Vercel Cron authenticates with `Authorization: Bearer $CRON_SECRET`, so set `CRON_SECRET` and `JOBS_SECRET` to the same value. (Hobby plans only allow daily crons; adjust the schedules or rely on the poll re-kick.)
4. Stripe webhook endpoint: `https://<app>/api/webhooks/stripe` (events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`). Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
5. Set the Supabase Auth Site URL to the app URL and allow `https://<app>/auth/callback`.

Local JSON storage is not suitable for Vercel (read-only, per-instance filesystem). The app warns at startup if the local store is used in production without `DEMO_MODE=true`.

## Supabase
See `supabase/README.md`: apply `supabase/migrations/0001_init.sql`, enable email auth, create admins via `ADMIN_EMAILS`. The `gift-assets` bucket is private; generated media (when real providers exist) is uploaded server-side and served through signed URLs.

## Stripe
Use test keys first. Prices are never configured in Stripe: checkout sessions are created with inline `price_data` from `src/lib/config/products.ts`, so the catalogue in code is the single source of truth. Orders become `paid` only via the verified webhook.

## Operations
- `GET /api/health` — liveness and which integrations are configured (booleans only).
- `/admin` — jobs, failed jobs with retry, orders, physical fulfilment (admin accounts only).
- Logs contain ids and statuses only. Search by gift or job id.
- Retry policy: 3 attempts, exponential backoff, permanent errors fail immediately and are shown to the sender with a retry button.

## Checks before a release
```
pnpm check            # typecheck + lint + unit tests + build
pnpm test:e2e         # Playwright journeys against the production build (demo mode)
```
Then the manual checklist in docs/SECURITY.md.
