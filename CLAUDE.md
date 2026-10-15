# Message in a Bottle — working instructions

Personalised emotional gifting platform: a sender writes a message, the app turns it into an illustrated, personalised story with music (and optionally a physical keepsake bottle with a QR code), delivered to the recipient by a private link.

Read `BUILD_PLAN.md` for scope and milestones, `PROGRESS.md` for the current state, and `docs/` for architecture, decisions, security, AI providers and deployment. Keep all of them accurate when you change things.

## Stack
- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind CSS 4 (`src/app/globals.css` holds the design tokens).
- Data: a `DataStore` interface (`src/lib/data/`) with a Supabase Postgres implementation and a local JSON/in-memory implementation for development, demos and tests. Supabase Auth for real accounts; signed-cookie demo sessions when Supabase is not configured.
- AI: provider interfaces in `src/lib/providers/` (story, image, music, narration). Local/procedural providers always exist; real providers are selected by environment variables.
- Payments: Stripe Checkout + signed, idempotent webhooks (`src/lib/payments/`). A clearly labelled demo checkout exists only when `DEMO_MODE=true`.
- Tests: Vitest (`src/**/*.test.ts`), Playwright (`e2e/`).

## Commands
```
pnpm install
pnpm dev            # http://localhost:3000
pnpm typecheck      # next typegen + tsc
pnpm lint
pnpm test           # vitest
pnpm build
pnpm test:e2e       # playwright (builds must exist: pnpm build first)
pnpm check          # typecheck + lint + test + build
```

## Conventions
- Server-only modules import `server-only`. Secrets are read only in `src/lib/config/env.ts`. Client code reads `NEXT_PUBLIC_*` only.
- Never trust client-supplied prices, ids of other users, or job state. Every mutation is authorised server-side via `src/lib/auth/`.
- Public recipient URLs use `gift.publicToken` (random, 32+ bytes), never database ids.
- Logs never contain message text, names or addresses. Log ids, statuses and timings.
- Mark anything simulated as such in the UI (`Notice tone="demo"`). Never fake a payment success or a provider result.
- Remembrance content: gentle language, never imply the deceased is speaking.
- Prefer small, complete increments. Run `pnpm check` before committing. Update `PROGRESS.md` with what was actually verified.
- Design: cream paper, deep ocean, sea glass, gold accents. Fraunces (display) + Manrope (UI). Restrained motion with `motion-reduce` variants. No emoji in UI, no purple AI gradients, no fake testimonials.
