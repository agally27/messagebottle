import "server-only";
import { describeOptions, formatPrice } from "@/lib/config/products";
import { priceOrder } from "@/lib/config/catalogue";
import { getStore } from "@/lib/data";
import type { Fulfilment, Gift, Order, OrderStatus, PaymentEvent, ShippingAddress, UserProfile } from "@/lib/domain/types";
import { shippingAddressSchema } from "@/lib/domain/schemas";
import { activateGift } from "@/lib/gifts/service";
import { emailConfigured, orderConfirmationEmail, sendEmail } from "@/lib/email";
import { newId, nowIso } from "@/lib/utils/ids";

export class OrderError extends Error {
  constructor(message: string, public readonly status: 400 | 404 | 409 = 400) {
    super(message);
  }
}

async function audit(action: string, subjectId: string, actorId: string | null, meta: Record<string, string | number | boolean | null> = {}) {
  await getStore().audit.append({ id: newId(), at: nowIso(), actorId, action, subjectType: "order", subjectId, meta });
}

export function orderRef(order: Pick<Order, "id">): string {
  return `MIB-${order.id.slice(0, 8).toUpperCase()}`;
}

/**
 * Creates a pending order with server-side pricing. The client only supplies
 * a product id and, for physical items, a shipping address.
 */
export async function createPendingOrder(user: UserProfile, gift: Gift, input: { productId: string; shippingAddress?: unknown; options?: { scent?: unknown } }): Promise<Order> {
  if (!gift.story || (gift.status !== "ready" && gift.status !== "active" && gift.status !== "revoked")) {
    throw new OrderError("This gift isn't ready to order yet.", 409);
  }
  const priced = priceOrder(input.productId, 1);
  if (!priced) throw new OrderError("That product isn't available.", 404);
  const minPhotos = priced.product.minPhotos ?? 0;
  if (minPhotos > 0 && (gift.photos?.length ?? 0) < minPhotos) {
    throw new OrderError(`The ${priced.product.name} prints photos from your gift. Add at least ${minPhotos === 1 ? "one photo" : `${minPhotos} photos`} first.`);
  }
  const options: Record<string, string> = {};
  if (priced.product.scentOptions?.length) {
    const scent = typeof input.options?.scent === "string" ? input.options.scent : "";
    if (!priced.product.scentOptions.some((s) => s.id === scent)) throw new OrderError("Please choose a fragrance (or unscented).");
    options.scent = scent;
  }
  let shippingAddress: ShippingAddress | null = null;
  if (priced.product.requiresShipping) {
    if (!input.shippingAddress) throw new OrderError("Please complete the delivery address.");
    const parsed = shippingAddressSchema.safeParse(input.shippingAddress);
    if (!parsed.success) throw new OrderError(parsed.error.issues[0]?.message ?? "Please complete the delivery address.");
    if (parsed.data.country !== "GB") throw new OrderError("We currently deliver physical items within the UK only.");
    shippingAddress = parsed.data;
  }
  const now = nowIso();
  const fulfilment: Fulfilment = {
    status: priced.product.requiresShipping ? "awaiting" : "not_required",
    notes: "",
    carrier: "",
    trackingNumber: "",
    dispatchedAt: null,
    deliveredAt: null,
  };
  const order: Order = {
    id: newId(),
    ownerId: user.id,
    giftId: gift.id,
    status: "pending",
    items: [{ productId: priced.product.id, name: priced.product.name, quantity: 1, unitPriceMinor: priced.product.priceMinor, ...(Object.keys(options).length ? { options } : {}) }],
    currency: "GBP",
    subtotalMinor: priced.subtotalMinor,
    shippingMinor: priced.shippingMinor,
    totalMinor: priced.totalMinor,
    paymentProvider: null,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    shippingAddress,
    fulfilment,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await getStore().orders.create(order);
  await getStore().gifts.update(gift.id, { productId: priced.product.id });
  await audit("order.created", order.id, user.id, { giftId: gift.id, productId: priced.product.id, totalMinor: order.totalMinor });
  return order;
}

/**
 * Marks an order paid exactly once, activates the gift and sends the
 * confirmation. Idempotent: a second call for a paid order is a no-op.
 */
export async function markOrderPaid(orderId: string, payment: { provider: "stripe" | "demo"; checkoutSessionId?: string | null; paymentIntentId?: string | null; amountMinor?: number | null; currency?: string | null }): Promise<Order | null> {
  const store = getStore();
  const order = await store.orders.get(orderId);
  if (!order) return null;
  if (order.status !== "pending") return order; // already paid / cancelled: nothing to do
  if (payment.amountMinor != null && payment.amountMinor !== order.totalMinor) {
    // Never silently accept a mismatched amount. Record and leave pending for review.
    await audit("order.amount_mismatch", order.id, null, { expected: order.totalMinor, received: payment.amountMinor });
    return order;
  }
  if (payment.currency && payment.currency.toUpperCase() !== order.currency) {
    await audit("order.currency_mismatch", order.id, null, { expected: order.currency, received: payment.currency });
    return order;
  }
  const updated = await store.orders.update(order.id, {
    status: "paid",
    paidAt: nowIso(),
    paymentProvider: payment.provider,
    stripeCheckoutSessionId: payment.checkoutSessionId ?? order.stripeCheckoutSessionId,
    stripePaymentIntentId: payment.paymentIntentId ?? order.stripePaymentIntentId,
  });
  await audit("order.paid", order.id, null, { provider: payment.provider, totalMinor: order.totalMinor });
  const gift = await store.gifts.get(order.giftId);
  if (gift) await activateGift(gift, payment.provider === "demo" ? "demo" : "paid");
  const owner = await store.users.get(order.ownerId);
  if (owner?.email && emailConfigured()) {
    await sendEmail(orderConfirmationEmail({ to: owner.email, orderRef: orderRef(order), items: order.items.map((i) => `${i.name}${describeOptions(i.productId, i.options) ? ` (${describeOptions(i.productId, i.options)})` : ""} × ${i.quantity}`), totalText: formatPrice(order.totalMinor), physical: order.shippingAddress !== null, orderId: order.id, giftId: order.giftId }));
  }
  return updated;
}

export async function cancelPendingOrder(orderId: string, actorId: string | null): Promise<Order | null> {
  const store = getStore();
  const order = await store.orders.get(orderId);
  if (!order || order.status !== "pending") return order;
  const updated = await store.orders.update(order.id, { status: "cancelled" });
  await audit("order.cancelled", order.id, actorId);
  return updated;
}

export async function recordRefund(orderId: string, actorId: string | null): Promise<Order | null> {
  const store = getStore();
  const order = await store.orders.get(orderId);
  if (!order) return null;
  const updated = await store.orders.update(order.id, { status: "refunded" });
  await audit("order.refunded", order.id, actorId);
  return updated;
}

const FULFILMENT_FLOW: Record<Fulfilment["status"], Fulfilment["status"][]> = {
  not_required: [],
  awaiting: ["printing", "packed", "dispatched"],
  printing: ["packed", "dispatched", "awaiting"],
  packed: ["dispatched", "printing"],
  dispatched: ["delivered", "packed"],
  delivered: ["dispatched"],
};

/** Admin: moves a physical order through fulfilment and records tracking. */
export async function updateFulfilment(orderId: string, actor: UserProfile, patch: { status?: Fulfilment["status"]; notes?: string; carrier?: string; trackingNumber?: string }): Promise<Order> {
  const store = getStore();
  const order = await store.orders.get(orderId);
  if (!order) throw new OrderError("Order not found.", 404);
  if (!order.shippingAddress) throw new OrderError("This order has no physical item.", 409);
  if (order.status !== "paid" && order.status !== "fulfilling" && order.status !== "dispatched" && order.status !== "delivered") throw new OrderError("Only paid orders can be fulfilled.", 409);
  const fulfilment: Fulfilment = { ...order.fulfilment };
  if (patch.status && patch.status !== fulfilment.status) {
    if (!FULFILMENT_FLOW[fulfilment.status].includes(patch.status)) throw new OrderError(`Cannot move from ${fulfilment.status} to ${patch.status}.`, 409);
    fulfilment.status = patch.status;
    if (patch.status === "dispatched") fulfilment.dispatchedAt = nowIso();
    if (patch.status === "delivered") fulfilment.deliveredAt = nowIso();
  }
  if (patch.notes !== undefined) fulfilment.notes = patch.notes.slice(0, 1000);
  if (patch.carrier !== undefined) fulfilment.carrier = patch.carrier.slice(0, 60);
  if (patch.trackingNumber !== undefined) fulfilment.trackingNumber = patch.trackingNumber.slice(0, 80);
  const status: OrderStatus = fulfilment.status === "dispatched" ? "dispatched" : fulfilment.status === "delivered" ? "delivered" : fulfilment.status === "printing" || fulfilment.status === "packed" ? "fulfilling" : order.status === "paid" ? "paid" : order.status;
  const updated = await store.orders.update(order.id, { fulfilment, status });
  await audit("order.fulfilment_updated", order.id, actor.id, { status: fulfilment.status });
  return updated ?? order;
}

export function paymentEventRecord(id: string, provider: "stripe" | "demo", type: string, orderId: string | null, amountMinor: number | null, currency: string | null): PaymentEvent {
  return { id, provider, type, orderId, amountMinor, currency, receivedAt: nowIso() };
}
