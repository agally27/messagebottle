import "server-only";
import { env } from "@/lib/config/env";
import { getStore } from "@/lib/data";
import type { Gift, Order, UserProfile } from "@/lib/domain/types";
import { createPendingOrder, markOrderPaid, OrderError, paymentEventRecord } from "@/lib/orders/service";
import { newId } from "@/lib/utils/ids";
import { getStripe, stripeConfigured } from "./stripe";

export type CheckoutStart = { kind: "stripe"; url: string; orderId: string } | { kind: "demo"; orderId: string };

/** Demo checkout is only ever available with DEMO_MODE=true and no Stripe keys. */
export function demoCheckoutAvailable(): boolean {
  return env.demoMode && !stripeConfigured();
}

/**
 * Starts checkout for a gift. Stripe when configured; otherwise, in demo mode
 * only, a labelled demo payment that marks the order paid without charging.
 */
export async function startCheckout(user: UserProfile, gift: Gift, input: { productId: string; shippingAddress?: unknown }): Promise<CheckoutStart> {
  const order = await createPendingOrder(user, gift, input);
  if (stripeConfigured()) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      metadata: { orderId: order.id, giftId: gift.id, ownerId: user.id },
      customer_email: user.email ?? undefined,
      line_items: [
        ...order.items.map((item) => ({
          quantity: item.quantity,
          price_data: { currency: "gbp", unit_amount: item.unitPriceMinor, product_data: { name: item.name, description: `For ${gift.input.recipientName}` } },
        })),
        ...(order.shippingMinor > 0 ? [{ quantity: 1, price_data: { currency: "gbp", unit_amount: order.shippingMinor, product_data: { name: "UK delivery" } } }] : []),
      ],
      success_url: `${env.appUrl}/orders/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/checkout/${gift.id}?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    await getStore().orders.update(order.id, { stripeCheckoutSessionId: session.id, paymentProvider: "stripe" });
    if (!session.url) throw new OrderError("Stripe did not return a checkout URL.", 409);
    return { kind: "stripe", url: session.url, orderId: order.id };
  }
  if (!demoCheckoutAvailable()) throw new OrderError("Payments are not configured.", 409);
  return { kind: "demo", orderId: order.id };
}

/** Completes a demo order. Refused outside demo mode. Idempotent per order. */
export async function completeDemoPayment(user: UserProfile, orderId: string): Promise<Order> {
  if (!demoCheckoutAvailable()) throw new OrderError("Demo payments are disabled.", 409);
  const store = getStore();
  const order = await store.orders.get(orderId);
  if (!order || order.ownerId !== user.id) throw new OrderError("Order not found.", 404);
  const event = paymentEventRecord(`demo_${order.id}`, "demo", "demo.payment_completed", order.id, order.totalMinor, order.currency);
  const { duplicate } = await store.payments.recordEvent(event);
  if (duplicate) return order;
  const paid = await markOrderPaid(order.id, { provider: "demo", amountMinor: order.totalMinor, currency: order.currency, checkoutSessionId: `demo_${newId()}` });
  return paid ?? order;
}
