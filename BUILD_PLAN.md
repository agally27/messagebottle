# Build plan

## Scope (v1)
A sender creates a gift in a guided wizard, previews a generated story, pays, and shares a private link. The recipient opens a cinematic reveal on any device without an account. Physical bottle orders are captured with shipping details and fulfilled manually via an admin view with print-ready output and a QR code.

Out of scope for v1: subscriptions, multiple languages, automated supplier integration, voice cloning, social features.

## Architecture (summary)
```
Browser ── Next.js App Router (server components + route handlers + server actions)
             ├─ src/lib/data        DataStore: Supabase (prod) | local JSON / memory (dev, demo, tests)
             ├─ src/lib/auth        Supabase Auth session | signed demo session; ownership + admin guards
             ├─ src/lib/story       brief → story (provider) → quality checks → scenes
             ├─ src/lib/providers   story | image | music | narration (+ local/procedural fallbacks)
             ├─ src/lib/jobs        generation job state machine, leases, retries, idempotency
             ├─ src/lib/payments    products, Stripe checkout, webhook verification, orders
             └─ src/lib/email       Resend (optional) with recorded deliveries
Supabase: Postgres (RLS), Auth, Storage (private bucket, signed URLs)
Stripe: Checkout Sessions, webhooks
```
See `docs/ARCHITECTURE.md` for detail.

## Milestones
| # | Milestone | Status |
| --- | --- | --- |
| 0 | Foundation: scaffold, tokens, fonts, config, docs | done |
| 1 | Brand, design system, landing page, navigation, legal pages | done |
| 2 | Gift creation wizard with validation and draft persistence | done |
| 3 | Story model, local story engine, generation jobs, sender preview, recipient reveal, audio | done |
| 4 | Persistence (local + Supabase), auth, ownership, secure links, dashboard, revoke/delete | done locally; Supabase unverified |
| 5 | Real AI providers behind interfaces (Anthropic story; image; narration), usage/cost tracking | Anthropic story implemented (unverified); image/narration placeholders |
| 6 | Products, Stripe checkout, webhooks, orders, physical fulfilment, QR, print-ready output, admin | done; Stripe unverified live |
| 7 | Hardening: tests, e2e, security/privacy review, deployment docs, release assessment | in progress |

## Definition of done (v1 core)
Visitor understands the product → starts a gift → enters message, occasion, style → app produces a complete example gift → sender previews → recipient opens via private link on mobile → errors never lose work → private data protected → reproducible build and tests → honest docs for missing live integrations.
