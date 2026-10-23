import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { SupabaseStore } from "./supabase-store";
import type { GiftInput, UserProfile } from "@/lib/domain/types";

/**
 * Runs the real SupabaseStore against a Supabase-compatible REST endpoint.
 * Skipped unless configured, so `pnpm test` never needs a database.
 *
 *   SUPABASE_TEST_URL      base URL serving /rest/v1 (a Supabase project, or local PostgREST behind a /rest/v1 prefix)
 *   SUPABASE_TEST_KEY      service-role key / JWT
 *   SUPABASE_TEST_USERS    two comma-separated auth.users ids that already exist
 *
 * Never point this at production: it writes and deletes rows.
 */
const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_KEY;
const users = (process.env.SUPABASE_TEST_USERS ?? "").split(",").filter(Boolean);
const enabled = Boolean(url && key && users.length >= 2);

const input: GiftInput = { occasion: "birthday", customOccasion: "", recipientName: "Maya", relationship: "my sister", pronouns: "she", ageRange: "adult", recipientContext: "", senderName: "Tom", message: "Happy birthday, Maya. You have always been the brave one. I am so proud of you, and I always will be.", memories: "", datesAndPlaces: "", tone: "celebratory", transformation: "story", theme: "storybook", music: "piano", narration: false, songUrl: "", rememberedName: "", rememberedDates: "" };

describe.skipIf(!enabled)("SupabaseStore (integration)", () => {
  let store: SupabaseStore;
  let a: UserProfile;
  let b: UserProfile;
  const created: string[] = [];

  beforeAll(async () => {
    store = new SupabaseStore({ url, secretKey: key });
    const now = new Date().toISOString();
    a = await store.users.upsert({ id: users[0]!, email: `a-${Date.now()}@example.test`, displayName: "Tom", isAdmin: false, kind: "supabase", createdAt: now, updatedAt: now });
    b = await store.users.upsert({ id: users[1]!, email: `b-${Date.now()}@example.test`, displayName: "Bea", isAdmin: false, kind: "supabase", createdAt: now, updatedAt: now });
    globalThis.__mibStore = store; // service-layer tests below use getStore()
  });

  afterAll(async () => {
    for (const id of created) await store.gifts.delete(id).catch(() => undefined);
    globalThis.__mibStore = undefined;
  });

  it("round-trips users", async () => {
    expect((await store.users.get(a.id))?.displayName).toBe("Tom");
    expect((await store.users.findByEmail(a.email!))?.id).toBe(a.id);
    expect(await store.users.get(randomUUID())).toBeNull();
  });

  it("creates, reads, updates, lists and deletes gifts", async () => {
    const now = new Date().toISOString();
    const gift = await store.gifts.create({ id: randomUUID(), ownerId: a.id, status: "draft", input, story: null, audio: [], publicToken: `tok_${randomUUID()}`, productId: null, openCount: 0, firstOpenedAt: null, lastOpenedAt: null, activatedAt: null, revokedAt: null, expiresAt: null, createdAt: now, updatedAt: now });
    created.push(gift.id);
    expect((await store.gifts.get(gift.id))?.input.recipientName).toBe("Maya");
    expect((await store.gifts.getByPublicToken(gift.publicToken))?.id).toBe(gift.id);
    expect((await store.gifts.listByOwner(a.id)).some((g) => g.id === gift.id)).toBe(true);
    expect((await store.gifts.listByOwner(b.id)).some((g) => g.id === gift.id)).toBe(false);
    const updated = await store.gifts.update(gift.id, { status: "failed" });
    expect(updated?.status).toBe("failed");
    expect((await store.gifts.get(gift.id))?.photos).toEqual([]); // 0002_photos default
    const photo = { id: randomUUID(), storageKey: `gifts/${gift.id}/photos/p.jpg`, contentType: "image/jpeg", width: 1600, height: 1200, bytes: 1234, caption: "Leeds", year: 2004, order: 0, createdAt: now };
    await store.gifts.update(gift.id, { photos: [photo] });
    expect((await store.gifts.get(gift.id))?.photos).toEqual([photo]);
    await store.gifts.recordOpen(gift.id, now);
    await store.gifts.recordOpen(gift.id, now);
    expect((await store.gifts.get(gift.id))?.openCount).toBe(2);
    expect((await store.gifts.get(gift.id))?.notifyOnOpen).toBe(true); // 0004 default
    const claims = await Promise.all([store.gifts.claimOpenNotification(gift.id, now), store.gifts.claimOpenNotification(gift.id, now)]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(await store.gifts.claimOpenNotification(gift.id, now)).toBe(false);
    expect((await store.gifts.update(gift.id, { notifyOnOpen: false }))?.notifyOnOpen).toBe(false);
    expect((await store.gifts.listAbandoned(new Date(Date.now() + 60_000).toISOString(), 500)).some((g) => g.id === gift.id)).toBe(true);
    expect(await store.gifts.delete(gift.id)).toBe(true);
    expect(await store.gifts.get(gift.id)).toBeNull();
  });

  it("schedules deliveries, claims each once, and removes them with the gift", async () => {
    const now = new Date().toISOString();
    const gift = await store.gifts.create({ id: randomUUID(), ownerId: a.id, status: "active", input, story: null, audio: [], photos: [], publicToken: `tok_${randomUUID()}`, productId: null, openCount: 0, firstOpenedAt: null, lastOpenedAt: null, activatedAt: now, revokedAt: null, expiresAt: null, createdAt: now, updatedAt: now });
    created.push(gift.id);
    const base = { giftId: gift.id, ownerId: a.id, to: "maya@example.test", note: "", status: "scheduled" as const, attempts: 0, lastError: null, emailId: null, sentAt: null, createdAt: now, updatedAt: now };
    const due = await store.deliveries.create({ ...base, id: randomUUID(), sendOn: "2026-01-02", sendAt: "2026-01-02T07:00:00.000Z" });
    const later = await store.deliveries.create({ ...base, id: randomUUID(), sendOn: "2099-12-25", sendAt: "2099-12-25T07:00:00.000Z" });
    expect(due.sendOn).toBe("2026-01-02");
    const listed = await store.deliveries.listDue(now, 50);
    expect(listed.some((d) => d.id === due.id)).toBe(true);
    expect(listed.some((d) => d.id === later.id)).toBe(false);
    expect((await store.deliveries.claim(later.id, now))).toBeNull(); // not due
    const [c1, c2] = await Promise.all([store.deliveries.claim(due.id, now), store.deliveries.claim(due.id, now)]);
    expect([c1, c2].filter(Boolean)).toHaveLength(1);
    const sent = await store.deliveries.update(due.id, { status: "sent", attempts: 1, sentAt: now, emailId: randomUUID() });
    expect(sent).toMatchObject({ status: "sent", attempts: 1 });
    expect((await store.deliveries.listByGift(gift.id)).map((d) => d.id).sort()).toEqual([due.id, later.id].sort());
    await store.gifts.delete(gift.id);
    expect(await store.deliveries.get(later.id)).toBeNull(); // cascade
  });

  it("claims jobs atomically and lists due work", async () => {
    const now = new Date().toISOString();
    const gift = await store.gifts.create({ id: randomUUID(), ownerId: a.id, status: "generating", input, story: null, audio: [], publicToken: `tok_${randomUUID()}`, productId: null, openCount: 0, firstOpenedAt: null, lastOpenedAt: null, activatedAt: null, revokedAt: null, expiresAt: null, createdAt: now, updatedAt: now });
    created.push(gift.id);
    const job = await store.jobs.create({ id: randomUUID(), giftId: gift.id, ownerId: a.id, status: "queued", step: "brief", completedSteps: [], attempts: 0, maxAttempts: 3, leaseUntil: null, nextRunAt: null, lastError: null, usage: [], progressMessage: "", mode: "demo", createdAt: now, updatedAt: now, startedAt: null, finishedAt: null });
    expect((await store.jobs.listDue(new Date().toISOString(), 50)).some((j) => j.id === job.id)).toBe(true);
    const lease = new Date(Date.now() + 60_000).toISOString();
    const first = await store.jobs.claim(job.id, lease, new Date().toISOString());
    expect(first?.status).toBe("running");
    expect(await store.jobs.claim(job.id, lease, new Date().toISOString())).toBeNull(); // leased
    expect((await store.jobs.listDue(new Date().toISOString(), 50)).some((j) => j.id === job.id)).toBe(false);
    await store.jobs.update(job.id, { completedSteps: ["brief"], leaseUntil: null, usage: [{ provider: "x", kind: "story", units: 1, unitLabel: "call", estimatedCostMinor: 2 }] });
    const latest = await store.jobs.getLatestForGift(gift.id);
    expect(latest?.completedSteps).toEqual(["brief"]);
    expect(latest?.usage[0]?.estimatedCostMinor).toBe(2);
    expect(await store.jobs.countForOwnerSince(a.id, new Date(Date.now() - 60_000).toISOString())).toBeGreaterThanOrEqual(1);
    expect((await store.jobs.listRecent(10, "running")).some((j) => j.id === job.id)).toBe(true);
  });

  it("rate limits, payment-event idempotency, audit and email records", async () => {
    const k = `test:${randomUUID()}`;
    expect((await store.rateLimit.hit(k, 2, 60_000)).allowed).toBe(true);
    expect((await store.rateLimit.hit(k, 2, 60_000)).allowed).toBe(true);
    expect((await store.rateLimit.hit(k, 2, 60_000)).allowed).toBe(false);
    const ev = { id: `evt_${randomUUID()}`, provider: "stripe" as const, type: "test", orderId: null, amountMinor: 1, currency: "gbp", receivedAt: new Date().toISOString() };
    expect((await store.payments.recordEvent(ev)).duplicate).toBe(false);
    expect((await store.payments.recordEvent(ev)).duplicate).toBe(true);
    await store.payments.deleteEvent(ev.id);
    expect((await store.payments.recordEvent(ev)).duplicate).toBe(false);
    await store.audit.append({ id: randomUUID(), at: new Date().toISOString(), actorId: a.id, action: "test.event", subjectType: "system", subjectId: null, meta: { n: 1 } });
    expect((await store.audit.listRecent(20)).some((e) => e.action === "test.event")).toBe(true);
  });

  it("runs the real service layer: generate → order → webhook paid → public link", async () => {
    const { createGift, startGeneration, getPublicGift } = await import("@/lib/gifts/service");
    const { createPendingOrder } = await import("@/lib/orders/service");
    const { handleStripeEvent } = await import("@/lib/payments/webhook");
    const gift = await createGift(a, input);
    created.push(gift.id);
    const job = await startGeneration(a, gift, { runInline: true });
    expect(job.status).toBe("succeeded");
    const ready = (await store.gifts.get(gift.id))!;
    expect(ready.status).toBe("ready");
    expect(ready.story?.scenes.length).toBeGreaterThanOrEqual(2);

    const address = { name: "Maya", line1: "1 Harbour Lane", line2: "", city: "Whitby", postcode: "YO21 1AA", country: "GB", giftNote: "" };
    const order = await createPendingOrder(a, ready, { productId: "little-bottle", shippingAddress: address });
    await store.orders.update(order.id, { stripeCheckoutSessionId: `cs_${order.id}` });
    expect((await store.orders.getByCheckoutSession(`cs_${order.id}`))?.id).toBe(order.id);
    const event = { id: `evt_${randomUUID()}`, type: "checkout.session.completed", data: { object: { id: `cs_${order.id}`, payment_status: "paid", payment_intent: `pi_${order.id}`, amount_total: order.totalMinor, currency: "gbp", metadata: { orderId: order.id } } } };
    expect((await handleStripeEvent(event)).handled).toBe(true);
    expect((await handleStripeEvent(event)).duplicate).toBe(true);
    const paid = (await store.orders.get(order.id))!;
    expect(paid.status).toBe("paid");
    expect((await store.orders.getByPaymentIntent(`pi_${order.id}`))?.id).toBe(order.id);
    expect((await store.orders.listAll({ physicalOnly: true }, 50)).some((o) => o.id === order.id)).toBe(true);
    expect((await store.orders.listByOwner(a.id)).some((o) => o.id === order.id)).toBe(true);

    const pub = await getPublicGift(ready.publicToken.length >= 40 ? ready.publicToken : "x");
    expect(pub?.recipientName).toBe("Maya");
  });
});
