import { beforeEach, describe, expect, it } from "vitest";
import { LocalStore } from "@/lib/data/local-store";
import { getStore } from "@/lib/data";
import type { GiftInput, UserProfile } from "@/lib/domain/types";
import { createGift, startGeneration } from "@/lib/gifts/service";
import { setProvidersForTests } from "@/lib/providers/registry";
import { LocalStoryProvider } from "@/lib/story/local-writer";
import { ProceduralImageProvider } from "@/lib/providers/image/procedural";
import { ProceduralMusicProvider } from "@/lib/providers/music/procedural";
import { NoNarrationProvider } from "@/lib/providers/narration/none";
import { priceOrder } from "@/lib/config/products";
import { createPendingOrder, markOrderPaid, updateFulfilment } from "@/lib/orders/service";
import { handleStripeEvent } from "./webhook";

const user: UserProfile = { id: "user-1", email: null, displayName: "Tom", isAdmin: false, kind: "demo", createdAt: "", updatedAt: "" };
const admin: UserProfile = { ...user, id: "admin-1", isAdmin: true };
const input: GiftInput = { occasion: "thank-you", customOccasion: "", recipientName: "Priya", relationship: "my friend", pronouns: "she", ageRange: "adult", recipientContext: "", senderName: "Tom", message: "Thank you for driving three hours to sit with me in that waiting room. You didn't say much. You didn't need to. I will never forget it.", memories: "", datesAndPlaces: "", tone: "heartfelt", transformation: "story", theme: "minimal", music: "peaceful", narration: false };

async function readyGift() {
  const gift = await createGift(user, input);
  await startGeneration(user, gift, { runInline: true });
  return (await getStore().gifts.get(gift.id))!;
}

const address = { name: "Priya S", line1: "1 Harbour Lane", line2: "", city: "Whitby", postcode: "YO21 1AA", country: "GB", giftNote: "" };

describe("pricing", () => {
  it("prices come from the catalogue, never the client", () => {
    expect(priceOrder("digital")?.totalMinor).toBe(499);
    expect(priceOrder("little-bottle")?.totalMinor).toBe(1699 + 395);
    expect(priceOrder("keepsake-box")?.totalMinor).toBe(3499);
    expect(priceOrder("not-a-product")).toBeNull();
    expect(priceOrder("digital", 0)?.subtotalMinor).toBe(499); // quantity floor
    expect(priceOrder("digital", 99)?.subtotalMinor).toBe(499 * 5); // quantity cap
  });
});

describe("orders and webhooks", () => {
  beforeEach(async () => {
    await (getStore() as LocalStore).reset();
    setProvidersForTests({ story: new LocalStoryProvider(), image: new ProceduralImageProvider(), music: new ProceduralMusicProvider(), narration: new NoNarrationProvider() });
  });

  it("creates a pending order with server-side totals and requires a UK address for physical items", async () => {
    const gift = await readyGift();
    await expect(createPendingOrder(user, gift, { productId: "little-bottle" })).rejects.toThrow(/address/i);
    await expect(createPendingOrder(user, gift, { productId: "little-bottle", shippingAddress: { ...address, country: "FR" } })).rejects.toThrow(/UK only/);
    const order = await createPendingOrder(user, gift, { productId: "little-bottle", shippingAddress: address });
    expect(order.status).toBe("pending");
    expect(order.totalMinor).toBe(2094);
    expect(order.fulfilment.status).toBe("awaiting");
    expect((await getStore().gifts.get(gift.id))?.status).toBe("ready"); // not active until paid
  });

  it("refuses to order a gift that has no story yet", async () => {
    const gift = await createGift(user, input);
    await expect(createPendingOrder(user, gift, { productId: "digital" })).rejects.toThrow(/isn't ready/);
  });

  it("marks paid once via a verified webhook event, activates the gift, and ignores duplicates", async () => {
    const gift = await readyGift();
    const order = await createPendingOrder(user, gift, { productId: "digital" });
    await getStore().orders.update(order.id, { stripeCheckoutSessionId: "cs_test_1" });
    const event = { id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_status: "paid", payment_intent: "pi_1", amount_total: 499, currency: "gbp", metadata: { orderId: order.id } } } };
    const first = await handleStripeEvent(event);
    expect(first).toMatchObject({ handled: true, orderId: order.id });
    const paid = (await getStore().orders.get(order.id))!;
    expect(paid.status).toBe("paid");
    expect(paid.stripePaymentIntentId).toBe("pi_1");
    expect((await getStore().gifts.get(gift.id))?.status).toBe("active");

    const again = await handleStripeEvent(event);
    expect(again.duplicate).toBe(true);
    const audit = await getStore().audit.listRecent(50);
    expect(audit.filter((a) => a.action === "order.paid").length).toBe(1);
  });

  it("does not mark an order paid when the amount or session does not match", async () => {
    const gift = await readyGift();
    const order = await createPendingOrder(user, gift, { productId: "digital" });
    await getStore().orders.update(order.id, { stripeCheckoutSessionId: "cs_test_2" });
    await handleStripeEvent({ id: "evt_2", type: "checkout.session.completed", data: { object: { id: "cs_test_2", payment_status: "paid", amount_total: 1, currency: "gbp", metadata: { orderId: order.id } } } });
    expect((await getStore().orders.get(order.id))?.status).toBe("pending");
    const mismatch = await handleStripeEvent({ id: "evt_3", type: "checkout.session.completed", data: { object: { id: "cs_other", payment_status: "paid", amount_total: 499, currency: "gbp", metadata: { orderId: order.id } } } });
    expect(mismatch.handled).toBe(false);
    expect((await getStore().orders.get(order.id))?.status).toBe("pending");
    const unpaid = await handleStripeEvent({ id: "evt_4", type: "checkout.session.completed", data: { object: { id: "cs_test_2", payment_status: "unpaid", amount_total: 499, currency: "gbp", metadata: { orderId: order.id } } } });
    expect(unpaid.reason).toMatch(/payment_status/);
    expect((await getStore().orders.get(order.id))?.status).toBe("pending");
  });

  it("cancels on session expiry and records refunds", async () => {
    const gift = await readyGift();
    const order = await createPendingOrder(user, gift, { productId: "digital" });
    await getStore().orders.update(order.id, { stripeCheckoutSessionId: "cs_exp" });
    await handleStripeEvent({ id: "evt_5", type: "checkout.session.expired", data: { object: { id: "cs_exp", metadata: { orderId: order.id } } } });
    expect((await getStore().orders.get(order.id))?.status).toBe("cancelled");

    const order2 = await createPendingOrder(user, gift, { productId: "digital" });
    await markOrderPaid(order2.id, { provider: "stripe", paymentIntentId: "pi_ref", amountMinor: 499, currency: "gbp" });
    await handleStripeEvent({ id: "evt_6", type: "charge.refunded", data: { object: { payment_intent: "pi_ref", refunded: true } } });
    expect((await getStore().orders.get(order2.id))?.status).toBe("refunded");
  });

  it("walks a physical order through fulfilment with valid transitions only", async () => {
    const gift = await readyGift();
    const order = await createPendingOrder(user, gift, { productId: "little-bottle", shippingAddress: address });
    await expect(updateFulfilment(order.id, admin, { status: "printing" })).rejects.toThrow(/paid/);
    await markOrderPaid(order.id, { provider: "demo", amountMinor: 2094, currency: "GBP" });
    await expect(updateFulfilment(order.id, admin, { status: "delivered" })).rejects.toThrow(/Cannot move/);
    let o = await updateFulfilment(order.id, admin, { status: "printing", notes: "Cream paper" });
    expect(o.status).toBe("fulfilling");
    o = await updateFulfilment(order.id, admin, { status: "dispatched", carrier: "Royal Mail", trackingNumber: "RM123" });
    expect(o.status).toBe("dispatched");
    expect(o.fulfilment.dispatchedAt).not.toBeNull();
    o = await updateFulfilment(order.id, admin, { status: "delivered" });
    expect(o.status).toBe("delivered");
  });
});
