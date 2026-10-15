import "server-only";
import type Stripe from "stripe";
import { env } from "@/lib/config/env";
import { getStore } from "@/lib/data";
import { cancelPendingOrder, markOrderPaid, paymentEventRecord, recordRefund } from "@/lib/orders/service";
import { getStripe } from "./stripe";

export type WebhookOutcome = { handled: boolean; duplicate?: boolean; reason?: string; orderId?: string | null };

/** The subset of a Stripe event we act on; keeps the handler testable without the SDK. */
export interface StripeEventLike {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export function verifyStripeSignature(rawBody: string, signature: string | null): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  if (!signature) throw new Error("Missing Stripe-Signature header");
  return getStripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}

/**
 * Applies a verified Stripe event. Idempotent by event id: the same event
 * delivered twice changes nothing and reports `duplicate`.
 */
export async function handleStripeEvent(event: StripeEventLike): Promise<WebhookOutcome> {
  const store = getStore();
  const obj = event.data.object;
  const orderIdFromMeta = (obj.metadata as Record<string, string> | undefined)?.orderId ?? (obj.client_reference_id as string | undefined) ?? null;
  const amount = typeof obj.amount_total === "number" ? obj.amount_total : null;
  const currency = typeof obj.currency === "string" ? obj.currency : null;

  const { duplicate } = await store.payments.recordEvent(paymentEventRecord(event.id, "stripe", event.type, orderIdFromMeta, amount, currency));
  if (duplicate) return { handled: true, duplicate: true, orderId: orderIdFromMeta };

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (obj.payment_status !== "paid") return { handled: true, reason: `payment_status=${String(obj.payment_status)}`, orderId: orderIdFromMeta };
      const sessionId = typeof obj.id === "string" ? obj.id : null;
      const order = orderIdFromMeta ? await store.orders.get(orderIdFromMeta) : sessionId ? await store.orders.getByCheckoutSession(sessionId) : null;
      if (!order) return { handled: false, reason: "order not found", orderId: orderIdFromMeta };
      if (order.stripeCheckoutSessionId && sessionId && order.stripeCheckoutSessionId !== sessionId) return { handled: false, reason: "session mismatch", orderId: order.id };
      await markOrderPaid(order.id, {
        provider: "stripe",
        checkoutSessionId: sessionId,
        paymentIntentId: typeof obj.payment_intent === "string" ? obj.payment_intent : null,
        amountMinor: amount,
        currency,
      });
      return { handled: true, orderId: order.id };
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const sessionId = typeof obj.id === "string" ? obj.id : null;
      const order = orderIdFromMeta ? await store.orders.get(orderIdFromMeta) : sessionId ? await store.orders.getByCheckoutSession(sessionId) : null;
      if (!order) return { handled: false, reason: "order not found", orderId: orderIdFromMeta };
      await cancelPendingOrder(order.id, null);
      return { handled: true, orderId: order.id };
    }
    case "charge.refunded": {
      const paymentIntent = typeof obj.payment_intent === "string" ? obj.payment_intent : null;
      if (!paymentIntent) return { handled: false, reason: "no payment intent" };
      const orders = await store.orders.listAll(undefined, 1000);
      const order = orders.find((o) => o.stripePaymentIntentId === paymentIntent);
      if (!order) return { handled: false, reason: "order not found" };
      if (obj.refunded === true) await recordRefund(order.id, null);
      return { handled: true, orderId: order.id };
    }
    default:
      return { handled: true, reason: "ignored event type" };
  }
}
