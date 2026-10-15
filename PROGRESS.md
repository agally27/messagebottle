# Progress

_Keep this accurate. "Verified" means a command was run and passed in this repository._

## Current state
Functional development build. The complete digital journey works end to end in demo mode (no credentials): create → generate → preview/edit → activate → recipient opens private link → revoke. Supabase store and migrations exist but are **unverified** (no project). Payments, orders, physical fulfilment and admin are the next milestone.

## Completed
- **M0 Foundation**: Next.js 16, TypeScript strict, Tailwind 4 tokens, vendored OFL fonts, ESLint, Vitest, Playwright, env schema, docs.
- **M1 Brand and marketing**: landing (hero, how it works, experience, occasions, products, FAQ), pricing, privacy, terms, support, not-found, error; header with mobile nav; footer. Procedural SVG scene art (6 themes × 12 motifs).
- **M2 Wizard**: six steps with zod validation per step, prompts, tone, transformation choice, theme previews, music previews (browser-synthesised), narration opt-in, review screen, localStorage draft that survives reloads, query-param prefill (`?occasion=`, `?product=`).
- **M3 Story and reveal**: content brief, faithful local story writer, scene/motif/time-of-day assignment, quality checks, durable job pipeline (leases, retries with backoff, permanent-error classification, idempotent restart, rate limit), generation screen with real step progress and retry, sender preview/editor (edit every line, reorder scenes, change look/sound/names without regeneration), recipient player (open → message → scenes → closing → keepsake; music, mute, pause, device narration, keyboard navigation, reduced motion), `/example`.
- **M4 Persistence and sharing (partial)**: `DataStore` interface; local JSON/memory store; Supabase store + SQL migration with RLS, claim/rate-limit functions and private bucket (**not run against a real project**); demo signed-cookie sessions; Supabase Auth magic-link flow and session-refresh proxy (**unverified**); ownership guards (404 on foreign ids); unguessable public tokens; activate/revoke/rotate/delete; dashboard.

## Verification log (latest run)
| Check | Command | Result |
| --- | --- | --- |
| Types | `pnpm typecheck` | pass |
| Lint | `pnpm lint` | pass, 0 warnings |
| Unit | `pnpm test` | 20 tests pass (story writer, quality, pipeline retries/failures/idempotency/rate limit, public access, edits, ownership) |
| Build | `pnpm build` | pass (19 routes) |
| E2E | `pnpm test:e2e` | 12 pass (6 journeys × mobile + desktop): landing, example reveal, full sender journey incl. stranger access 404 and revoke, draft persistence, invalid links, auth redirect |

## Blockers / needs a human
- No credentials configured: Supabase, Stripe, Anthropic, OpenAI, ElevenLabs, Resend. Everything runs in labelled demo mode.
- Supabase store and auth code paths are written but untested; expect small fixes on first real run.
- Prices and product descriptions are hypotheses; no supplier or fulfilment partner exists.

## Next tasks
1. M6 commerce: Stripe Checkout, signed idempotent webhook, orders, shipping address, QR code, print-ready page, admin fulfilment view, demo checkout guard.
2. M5 providers: Anthropic story provider (structured output, quality-checked), usage/cost tracking; image/narration interfaces documented.
3. M7 hardening: tests for pricing and webhooks, security review, deployment docs, release assessment.
