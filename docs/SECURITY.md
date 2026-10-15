# Security and privacy

Personal messages are intimate. This document states what the code does today and what remains before a public launch. None of it has been independently audited.

## Access control
- **Ownership on every private operation.** `requireOwnedGift`/`requireOwnedOrder` load by id and compare `ownerId` to the session user; mismatches return 404 (not 403) so ids cannot be probed. Server actions and route handlers both go through these guards; UI checks are never relied on.
- **Public gifts by token only.** `/g/[token]` resolves a 32-byte random base64url token (`newPublicToken`). Tokens are validated for shape before lookup. The recipient view is a projection (`PublicGift`) with no account, id or address data. Revoked, unactivated, expired or deleted gifts all render "not available".
- **Admin** routes require `isAdmin`, derived from `ADMIN_EMAILS` for Supabase accounts. Demo accounts are never admins.
- **Supabase RLS** policies (milestone 4) restrict rows to their owner; background jobs and webhooks use the server-only secret key.

## Sessions
- With Supabase: cookie-based auth via `@supabase/ssr`, refreshed in `proxy.ts`.
- Without: a demo session cookie `mib_session` = base64url payload + HMAC-SHA256 signature using `SESSION_SECRET`, `httpOnly`, `SameSite=Lax`, `Secure` in production, 90-day expiry. Demo sessions are refused when Supabase is configured. `SESSION_SECRET` is mandatory in production.

## Secrets
- Read only in `src/lib/config/env.ts` (server-only). Client code sees `NEXT_PUBLIC_*` only.
- `.env*` is git-ignored; `.env.example` lists names without values.
- `/api/health` reports booleans, never values.

## Payments (milestone 6)
- Prices come from `products.ts`; the client sends only a product id.
- Stripe webhooks verify the signature and are idempotent by event id (`payments.recordEvent`). Orders are marked paid by webhook, never by the success URL.
- Demo checkout exists only when `DEMO_MODE=true` and is labelled.

## Abuse and cost controls
- Per-sender generation rate limit (`GENERATION_RATE_LIMIT_PER_HOUR`).
- Duplicate-job prevention and leases; permanent provider errors never retry.
- `/api/jobs/run` requires `JOBS_SECRET` (constant-time compare).
- Input limits on every field (zod), no HTML rendering of user text.
- Security headers in `next.config.ts` (nosniff, referrer policy, frame options, permissions policy).

## Privacy
- Logs contain ids, statuses, codes and timings — never message text, names or addresses.
- Audit events store ids and small structured metadata only.
- Deleting a gift removes its story, scenes, audio references and jobs.
- Gift content is sent to AI providers only to fulfil that gift, and only when a provider is configured; this is disclosed in the privacy notice.

## Before public launch
- [ ] Supabase backend with RLS applied and verified against a second account
- [ ] Private storage bucket with signed URLs for any generated media
- [ ] Platform-level rate limiting / WAF in front of expensive endpoints
- [ ] Content moderation pass on the story brief (abuse, minors, impersonation)
- [ ] Privacy notice, terms and refund policy reviewed by a professional
- [ ] Data-processing review of each AI provider (retention, training opt-out)
- [ ] Draft retention job (remove abandoned drafts after 90 days)
- [ ] Dependency and header review; CSP
