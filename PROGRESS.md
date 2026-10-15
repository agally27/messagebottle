# Progress

_Keep this accurate. "Verified" means a command was run and passed in this repository._

## Current state
Functional development build. In demo mode (no credentials) the complete journey works end to end: create → generate → preview/edit → checkout (demo) or activate → recipient opens the private link → physical order fulfilled from the admin view → revoke. Stripe, Supabase, Anthropic and Resend integrations are implemented behind interfaces but **unverified** against live services (no credentials in this environment).

## Completed
- **M0 Foundation**: Next.js 16, TypeScript strict, Tailwind 4 tokens, vendored OFL fonts, ESLint, Vitest, Playwright, env schema, docs.
- **M1 Brand and marketing**: landing (hero, how it works, experience, occasions, products, FAQ), pricing, privacy, terms, support, not-found, error; header with mobile nav; footer. Procedural SVG scene art (6 themes × 12 motifs).
- **M2 Wizard**: six steps with zod validation per step, prompts, tone, transformation choice, theme previews, music previews (browser-synthesised), narration opt-in, review screen, localStorage draft that survives reloads, query-param prefill (`?occasion=`, `?product=`).
- **M3 Story and reveal**: content brief, faithful local story writer, scene/motif/time-of-day assignment, quality checks, durable job pipeline (leases, retries with backoff, permanent-error classification, idempotent restart, rate limit), generation screen with real step progress and retry, sender preview/editor (edit every line, reorder scenes, change look/sound/names without regeneration), recipient player (open → message → scenes → closing → keepsake; music, mute, pause, device narration, keyboard navigation, reduced motion), `/example`.
- **M5 Providers (partial)**: provider interfaces for story, image, music and narration; Anthropic story provider with structured outputs, quality-checked and falling back to the local writer (**not exercised against the live API**); image and narration real providers are placeholders that fail fast as permanent errors; usage/cost recorded per job and summed in admin.
- **M6 Commerce and fulfilment**: configurable catalogue with server-side pricing; Stripe Checkout session creation with inline prices; signature-verified, idempotent webhook (completed/expired/refunded) that marks orders paid only on `payment_status=paid` with matching amount, currency and session; demo checkout guarded by `DEMO_MODE` and absent Stripe keys; orders with UK shipping address validation; order page driven by server state, never the success URL; QR code route (owner/admin); print-ready A5 insert; admin overview (config flags, revenue, estimated generation cost), jobs list with retry, orders list and fulfilment workflow (awaiting → printing → packed → dispatched → delivered, tracking, notes); email provider (Resend) with recorded deliveries, gift-link and order-confirmation templates, "send by email" on the share panel.
- **Design pass (production look)**: photographic hero with the recipient's phone and a handwritten note, feature strip, kraft "unboxing" section, brand moment with polaroid and glowing bottle, restyled products and final call to action; signature glowing-bottle SVG used across the reveal, generating, dashboard and login screens; drifting fairy lights on dark themes; Caveat handwriting accent; warm tokens (kraft, amber, glow); scroll-triggered reveals (print and reduced-motion safe); favicon and Open Graph image. Photography is placeholder crops from the founder's mood board (see docs/DESIGN.md).
- **M7 Hardening**: adversarial security review with all findings fixed; axe accessibility scans in the e2e suite; contrast-safe tokens; draft retention sweep; open counting on tap; safe redirects; Vercel cron config; mocked-SDK tests for the Anthropic provider.
- **M4 Persistence and sharing (partial)**: `DataStore` interface; local JSON/memory store; Supabase store + SQL migration with RLS, claim/rate-limit functions and private bucket (**not run against a real project**); demo signed-cookie sessions; Supabase Auth magic-link flow and session-refresh proxy (**unverified**); ownership guards (404 on foreign ids); unguessable public tokens; activate/revoke/rotate/delete; dashboard.

## Verification log (latest run)
| Check | Command | Result |
| --- | --- | --- |
| Types | `pnpm typecheck` | pass |
| Lint | `pnpm lint` | pass, 0 warnings |
| Unit | `pnpm test` | 34 tests pass (story writer, quality, pipeline retries/failures/idempotency/rate limit, regeneration and deletion guards, public projection, retention sweep, safe redirects, ownership, pricing, webhook idempotency/retry/mismatch, refunds, fulfilment transitions) |
| Build | `pnpm build` | pass (29 routes) |
| E2E | `pnpm test:e2e` | 30 pass (8 journeys + 7 axe scans, × mobile + desktop): landing, example reveal, full sender journey incl. stranger access 404 and revoke, draft persistence, invalid links, auth redirect, open-redirect refusal, demo checkout (digital + physical with address validation), print page + QR, non-admin blocked, admin fulfilment to dispatched; axe WCAG A/AA with no serious/critical violations on landing, pricing, wizard, login, support, example (closed and opened) |
| Security review | adversarial read of auth, actions, routes, payments, RLS | 1 high, 7 medium, 7 low findings — all fixed (see docs/SECURITY.md review log) |

## Deployment readiness (Vercel + Supabase)
- Deploy guide: docs/DEPLOYMENT.md. **Not deployed yet**: the build environment cannot reach vercel.com or supabase.com.
- Migration verified on Postgres 16: applies and re-applies cleanly; RLS blocks owners writing gifts, admin self-escalation and order inserts; server-only functions are not executable by anon/authenticated.
- `SupabaseStore` verified end to end against PostgREST 12 with the real migration (`pnpm test:supabase`, 5 tests including generate → order → webhook paid → public link).
- Still unverified until a real project exists: Supabase Auth magic-link sign-in and the session refresh proxy.
- Vercel fixes: crons made daily (Hobby limit), app URL defaults to the Vercel domain, env aliases for the Vercel Supabase integration, signed-out senders are sent to sign-in with their draft kept.

## Overall assessment
**Functional development build, not a release candidate.** Every user-facing journey works end to end in demo mode and is covered by automated tests, the security review findings are fixed, and the architecture is ready for real services. It becomes a release candidate once Supabase, Stripe (test mode) and at least one AI provider have been run for real and the launch checklist in docs/SECURITY.md is done.

## Blockers / needs a human
- No credentials configured: Supabase, Stripe, Anthropic, OpenAI, ElevenLabs, Resend. Everything runs in labelled demo mode.
- Supabase store and auth code paths are written but untested; expect small fixes on first real run.
- Prices and product descriptions are hypotheses; no supplier or fulfilment partner exists.

## Next tasks
1. Verify against real services: create a Supabase project and run the migration; run Stripe test mode end to end with the CLI webhook forwarder; set `ANTHROPIC_API_KEY` and confirm `job.mode === "live"` and story provenance.
2. Real image and narration providers behind the existing interfaces, storing media in the private bucket with signed URLs.
3. Launch hygiene: draft-retention job, content moderation on the brief, CSP, legal review of privacy/terms/refunds, pricing validation against real costs.
