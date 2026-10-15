# Decisions

Short records of choices that shape the product. Newest last.

### 1. Build in `agally27/messagebottle`, not the connected `sprint` repo
The cloud session was attached to `agally27/sprint`, an unrelated productivity app. The brief names the `messagebottle` repository, which existed and was empty. Work went there on the session's branch name (`claude/friendly-hamilton-h5i2xs`), leaving `sprint` untouched.

### 2. Next.js 16 with Cache Components off
Nearly every route reads a session or the data store, so the classic rendering model (dynamic on `cookies()`/data access, static otherwise) is simpler and lower-risk than Partial Prerendering with Suspense boundaries everywhere. Marketing pages are still fully static.

### 3. A `DataStore` interface with a local implementation first
Supabase is the production target, but a single-file JSON store lets the whole journey run with zero credentials, keeps tests fast, and forces every caller through one boundary. The Supabase implementation mirrors the interface and ships with SQL migrations and RLS.

### 4. Demo sessions instead of a sign-in wall
Without Supabase Auth, a signed HMAC cookie creates a guest account the moment someone starts a gift. Ownership checks are identical in both modes. Demo sessions are disabled automatically when Supabase is configured.

### 5. Preview first, pay to send
Senders create and preview the full gift for free; payment (or demo activation) unlocks the private link. This is the stronger funnel and keeps charges predictable. Generation cost is bounded by a per-sender hourly rate limit and by local providers being the default. A `GENERATION_REQUIRES_PAYMENT`-style gate can be added behind the same service function if margins demand it.

### 6. A faithful local writer as the baseline, not a mock
The local story writer keeps every sentence the sender wrote, in order, and only adds framing that references supplied facts. It is the no-credential experience, the fallback when a model fails or drifts, and the reference the quality checker measures model output against.

### 7. Procedural scene art and music
Deterministic SVG scenes (theme × motif × time of day × seed) and a Web Audio soundtrack synthesised from a mood give a complete, consistent, royalty-free experience with nothing to store or pay for. Real image and music providers replace them per scene/asset behind the same interfaces, and the UI always says which is in use.

### 8. Database-backed jobs with leases, run after the response
No queue service is required: jobs are rows with a lease and a next-run time; `after()` runs them once the response is sent, the status poll re-kicks stale ones, and a secret-protected endpoint supports cron. A queue (e.g. Inngest/QStash) can replace `kickJob` without touching the pipeline.

### 9. Public tokens, never ids
Recipient links carry a 32-byte base64url token. Internal ids never appear in public URLs or recipient HTML, and gifts of other users return "not found" rather than "forbidden" to avoid probing.

### 10. Prices live in one config file
`src/lib/config/products.ts` is the only price source; checkout and webhooks recompute totals server-side. Amounts are indicative hypotheses (see docs/PRODUCT.md) until validated.

### 11. Fonts vendored, not fetched
Fraunces and Manrope (both OFL) are committed as woff2 and loaded with `next/font/local`, so builds never depend on network access to Google Fonts.

### 12. Mood-board crops as placeholder photography
The founder's mood board set the direction (golden hour, kraft, glowing bottle, handwritten notes). To get the landing page to that standard without a photo shoot, crops of the board are used as product photography in four places, labelled in docs/DESIGN.md as placeholders to replace with real shots. Everything else that looks photographic is drawn: the glowing bottle and scene art are SVG, so they stay crisp and consistent.

### 13. Supabase rather than Neon
Both host Postgres well. The app already relies on Supabase Auth (magic links), Storage (private bucket for generated media) and RLS tied to `auth.uid()`. Neon would need a separate auth provider and storage, more moving parts for no gain at this stage. The `DataStore` interface keeps a later move possible.

### 14. Song links play through the service's own player
Licensing makes hosting or clipping commercial music a non-starter. A gift stores a link from an allowlisted music service and shows that service's official embed, loaded only after the recipient taps play (no third-party requests or cookies before then). Full-track playback depends on the recipient's own account with that service, which the wizard says plainly.

### 15. Photos are re-encoded and served through the app, not storage URLs
Storing the original upload would keep EXIF location and camera data. Every photo is decoded and re-encoded server-side, and both views (recipient by token, owner/admin by id) stream it through an authorised route, so revoking a link or deleting a gift immediately stops access; there are no long-lived signed URLs to leak.

