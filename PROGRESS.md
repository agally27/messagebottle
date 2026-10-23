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
| Unit | `pnpm test` | 71 tests pass (5 Supabase integration tests skipped without a database; run with `pnpm test:supabase`). Original 34 covered (story writer, quality, pipeline retries/failures/idempotency/rate limit, regeneration and deletion guards, public projection, retention sweep, safe redirects, ownership, pricing, webhook idempotency/retry/mismatch, refunds, fulfilment transitions) |
| Build | `pnpm build` | pass |
| E2E | `pnpm test:e2e` | 40 pass (12 journeys + 7 axe scans, × mobile + desktop, plus 2 digital-only journeys on a server with physical products off), adding scheduled delivery, Christmas, memory and remembrance journeys to the original set: landing, example reveal, full sender journey incl. stranger access 404 and revoke, draft persistence, invalid links, auth redirect, open-redirect refusal, demo checkout (digital + physical with address validation), print page + QR, non-admin blocked, admin fulfilment to dispatched; axe WCAG A/AA with no serious/critical violations on landing, pricing, wizard, login, support, example (closed and opened) |
| Security review | adversarial read of auth, actions, routes, payments, RLS | 1 high, 7 medium, 7 low findings — all fixed (see docs/SECURITY.md review log) |

## Christmas (seasonal)
- Christmas occasion, Winter wonderland theme (fir trees, snow, fairy lights), festive glowing bottle in the reveal, four public-domain carols played in the browser with personalised words added to the story as "A carol for you".
- Christmas Bottle product (1 Oct – 18 Dec, UK dates) with a required fragrance choice (winter spice, fireside pine, unscented) carried to Stripe, the order, admin and email; Christmas-styled printed card with holly.
- Seasonal landing and pricing section, hidden out of season (pages revalidate hourly).
- Verified: 11 new unit tests (carol bar timing, personalised words, carol scene, seasonality incl. the London-date boundary, fragrance validation); Christmas wizard-to-gift journey in Playwright on mobile and desktop.

## Memory in a Bottle
- Wizard step "Photos & song" (optional): up to 12 photos with caption and year, a song link from Spotify / Apple Music / YouTube / SoundCloud / Deezer / TIDAL, and for remembrance gifts "In loving memory of" name and years. Photos are shrunk in the browser and uploaded right after the gift is created; failures are reported on the generating screen.
- Photos re-encoded server-side (sharp: rotate, ≤1600 px, JPEG, metadata stripped) and stored via a `MediaStore` (memory / `.data/media` / private Supabase bucket). Recipient route by token only for live gifts; owner/admin route for preview, editor and print. Deleted with the photo, the gift and the retention sweep.
- Recipient player: "Moments worth keeping" polaroid timeline (sorted by year), "Our song" card that mounts the official embed only after a tap and pauses the procedural music, "In loving memory of…" on the opening and keepsake.
- Gift page editor "Photos, song and dedication" (add/remove immediately; captions, years and order saved together; song and dedication saved without regeneration).
- Memory Bottle product (£24.99 + £3.95): refuses checkout without a photo; print page adds a sheet of three mini prints and the in-memory line.
- Landing section "Memory in a Bottle" (drawn scene art in the polaroids, no customer photos).
- Fixed along the way: the local writer produced a single scene for very short messages, so generation retried and failed; it now splits at natural pauses or adds a quiet framing scene (words unchanged). It also signed off as "(your husband)" when the recipient was the sender's husband; that inverted sign-off is gone.
- Verified: 12 new unit tests (song allowlist, EXIF/GPS stripped, bad types refused, 12-photo cap, edit/reorder, public projection has no gift id or storage keys, token route 404 until live, deletion removes files, Memory Bottle needs a photo, remembrance saved without regeneration, short-message stories, sign-off); Playwright memory journey (upload in the wizard → gift page editor → Memory Bottle demo checkout → mini prints → recipient timeline and tap-to-load song) and remembrance journey on mobile and desktop; `pnpm test:supabase` with both migrations applied twice and photos round-tripped through Postgres.
- **Unverified:** Supabase Storage upload/download/remove against a real project (the local PostgREST harness has no Storage); real Spotify/Apple/YouTube embeds (blocked in the build sandbox, the embed URLs follow each service's documented format).
- **Action for the deployed project:** run `supabase/migrations/0002_photos.sql` in the SQL editor before deploying this release.

## Digital-first launch
- `PHYSICAL_PRODUCTS` switch (default **off**): only the Digital Gift is listed and priced; physical products are refused server-side (order pricing and new gifts), the send page goes straight to checkout, the share panel hides "Add a physical bottle", the wizard ignores stale `?product=` links. Landing/pricing copy adapts: digital hero, "Send the link" step, "Keepsake bottles: coming soon" card (no price, no button), bottle FAQ replaced by "Can I send a real bottle? Not yet", Christmas section shows the digital Christmas story until 26 Dec, Memory section shows the digital price. Admin and existing physical orders unaffected.
- Verified: 3 unit tests (catalogue off/on; default-off server refuses a bottle order and drops a bottle product id on a new gift); Playwright now starts a second server with the switch off and runs 2 journeys there (pricing shows only the digital gift; a stale bottle link creates a digital gift, checkout offers only the digital gift, hand-edited send/checkout URLs fall back, demo payment of £4.99 completes). The main suite runs with the switch on so physical flows stay covered.

## Scheduled delivery
- Email the gift link now or on a chosen day (tomorrow to a year ahead, UK dates); arrives that morning by 9am UK time via the daily 07:00 UTC cron (Hobby-compatible). One pending delivery per gift, cancel/replace, status and history on the gift page and order page. Atomic claim (no double sends), one immediate retry, link re-checked on the day, revoking cancels, deleted with the gift. Same sender rules as "send now" (paid, signed-in or operator).
- New table `scheduled_deliveries` (migration `0003_scheduled_deliveries.sql`, RLS owner-read). `RESEND_API_URL` override exists only for tests.
- Fixed: short messages split across two scenes passed the shape check but failed the "sentences kept" quality check (and with a memory, the memory scene landed mid-sentence), so generation retried and failed. The checker now also reads the scene text continuously, and the writer doesn't split when a memory scene follows. Regression test runs both checks.
- Verified: 7 unit tests (UK date window and 07:00 UTC due time across BST/GMT, validation, sender eligibility, send on the day with the live link and note, never twice incl. overlapping runs, retry then failure, revoke/expiry/cancel, delete cascade); Supabase integration test against Postgres with 0003 applied (due listing, concurrent claim gives one winner, cascade); Playwright journey with a local stand-in for the Resend API: operator schedules, sees it, past date refused by the server, cancels, sends now, the received email links to the live gift and opens it; guests see email is for paid gifts.
- **Unverified:** Vercel's cron actually firing at 07:00 UTC on the deployed project, and real Resend delivery (needs `RESEND_API_KEY` and a verified sending domain).
- **Action for the deployed project:** run `supabase/migrations/0003_scheduled_deliveries.sql` before deploying this release.

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
