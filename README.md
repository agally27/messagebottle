# Message in a Bottle

**More than a message. A feeling, made for you.**

A personalised emotional gifting platform. Someone writes a message for a person they love; the app turns it into a short, illustrated, personalised story with a soundtrack that the recipient opens through a private link — no app, no account. Optionally, a real keepsake bottle holds the printed message and a QR code to the digital story.

## Status

Functional development build. See [`PROGRESS.md`](PROGRESS.md) for what is implemented and verified, and [`docs/`](docs/) for architecture, decisions, security, AI providers and deployment. No live credentials are configured in this repository; without them the app runs in a clearly labelled demo mode (local data store, procedural art and soundtrack, demo checkout).

## Quick start

```bash
pnpm install
cp .env.example .env.local   # optional; everything runs without it
pnpm dev                     # http://localhost:3000
```

```bash
pnpm typecheck   # next typegen + tsc
pnpm lint
pnpm test        # vitest unit tests
pnpm build
pnpm test:e2e    # Playwright journeys (runs against a production build)
pnpm check       # all of the above except e2e
```

## Repository

```
src/app            routes (App Router): marketing, create wizard, gift editor, recipient reveal, dashboard, checkout, admin, API
src/components     UI primitives, marketing sections, wizard, gift player, procedural scene art
src/lib/domain     occasions, themes, tones, music moods, types, zod schemas
src/lib/data       DataStore interface + Supabase and local implementations
src/lib/auth       sessions, ownership and admin guards
src/lib/story      brief → story → scenes, quality checks
src/lib/providers  story / image / music / narration provider interfaces and implementations
src/lib/jobs       generation job state machine
src/lib/payments   products, Stripe checkout and webhooks, orders
supabase/          SQL migrations and RLS policies
docs/              product, architecture, decisions, security, AI providers, deployment
```

## Documentation

| Doc | Covers |
| --- | --- |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Vision, audience, journeys, products and pricing hypotheses |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System shape, data model, data flows |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Significant decisions and trade-offs |
| [docs/SECURITY.md](docs/SECURITY.md) | Access control, secrets, privacy, data protection |
| [docs/AI_PROVIDERS.md](docs/AI_PROVIDERS.md) | Provider interfaces, configuration, costs, fallbacks |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environment, Supabase, Stripe, Vercel, operations |
| [BUILD_PLAN.md](BUILD_PLAN.md) | Scope and milestones |
| [PROGRESS.md](PROGRESS.md) | Current state, verification log, next tasks |
