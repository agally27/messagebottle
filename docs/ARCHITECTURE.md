# Architecture

## Shape

```
┌──────────────────────────── Next.js 16 (App Router) ─────────────────────────────┐
│ (marketing)/   landing, pricing, privacy, terms, support        static            │
│ create/        wizard (client, draft in localStorage)           dynamic           │
│ gifts/[id]/    sender: editor + preview + share + send          owner-only        │
│ g/[token]/     recipient reveal                                 public by token   │
│ dashboard/     sender's gifts and orders                        owner-only        │
│ login/, auth/  demo guest session | Supabase magic link                           │
│ checkout/, orders/, admin/                                      (milestone 6)     │
│ api/           gifts/[id]/job (poll), jobs/run (cron), health, webhooks, qr       │
├──────────────────────────────── src/lib ─────────────────────────────────────────┤
│ domain/      occasions · themes · tones · music · types · zod schemas             │
│ config/      env (server-only, zod-validated) · products (prices) · site          │
│ auth/        session (demo cookie | Supabase) · guards (owner/admin)              │
│ data/        DataStore interface · LocalStore (JSON/memory) · SupabaseStore       │
│ story/       brief → local-writer → scenes (art specs) → quality checks           │
│ providers/   StoryProvider · ImageProvider · MusicProvider · NarrationProvider    │
│ jobs/        pipeline (steps, leases, retries) · kick (after-response runner)     │
│ gifts/       service (create, generate, edit, activate, revoke, public view)      │
│ actions/     server actions used by the UI                                        │
│ audio/       procedural music (Web Audio) · device narration (SpeechSynthesis)    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## Principles

1. **One journey, many occasions.** Occasion, tone, theme and music are configuration (`src/lib/domain`), not separate flows.
2. **The sender's words are the foundation.** `ContentBrief` is the only source of facts. The local writer keeps every sentence verbatim; model providers are checked against the brief by `quality.ts` and fall back to the local writer when they drift.
3. **Everything works without credentials.** Local store, local writer, procedural art and music, demo sessions and demo activation. Each is labelled as a demonstration in the UI. Real providers slot in behind the same interfaces via environment variables.
4. **Generation is a durable job**, not a request. Steps persist as they complete; leases prevent double-running; transient errors retry with backoff; permanent errors (auth, billing, invalid request) fail fast; a failed gift keeps its input and can be retried without duplicating spend.
5. **Private by construction.** Recipients get an unguessable 256-bit token, never an id. The recipient view (`PublicGift`) is a projection with no account data. Every owner operation re-checks ownership server-side.

## Data model

```
UserProfile ──1:n── Gift ──1:n── GenerationJob
                      │  ├── input: GiftInput (wizard answers)
                      │  ├── story: Story { title, opening, scenes[], closing, dedication, provenance }
                      │  │      Scene { id, order, heading, text, artPrompt, art: procedural spec | stored image }
                      │  ├── audio: AudioAsset[] (music: procedural mood | stored url; narration: stored url)
                      │  └── publicToken, status: draft → generating → ready → active ⇄ revoked | failed
                      └──1:n── Order ──1:n── OrderItem, Fulfilment, PaymentEvent (idempotent by provider event id)
AuditEvent (ids and statuses only, never message text) · EmailDelivery · rate-limit counters
```

## Generation pipeline

```
createGift → startGeneration (rate limit, idempotent) → job queued → kickJob (after response)
runJob: claim lease → brief → story → scenes → images → audio → assemble → gift.ready
                       │ transient error: attempts+1, backoff, requeue (poll/cron re-kicks)
                       │ permanent error or attempts exhausted: job.failed, gift.failed, input intact
```
The generation screen polls `/api/gifts/[id]/job`; the poll also re-kicks stale jobs, and `/api/jobs/run` (secret-protected) can be driven by a cron for hosts without `after()` support.

## Recipient experience

`GiftPlayer` (client) renders stages: closed → opening → message → scenes → closing → keepsake. Audio starts only after the "Open the bottle" tap. Music is synthesised in the browser from the mood (or played from a stored URL when a music provider exists). Narration uses a stored asset when present, otherwise the device's speech synthesis; text is always visible. Reduced-motion preferences shorten or remove animation.

## Persistence backends

| Backend | When | Notes |
| --- | --- | --- |
| `memory` | tests, e2e | nothing persists |
| `local` | development, demos | single JSON file in `.data/`, atomic writes, single process |
| `supabase` | production | Postgres with RLS, Auth, Storage; see `supabase/migrations` and docs/DEPLOYMENT.md |
