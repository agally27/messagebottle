import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/site/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { SharePanel } from "@/components/gift/SharePanel";
import { requireUserOrRedirect } from "@/lib/auth/guards";
import { env } from "@/lib/config/env";
import { formatPrice } from "@/lib/config/products";
import { getStore } from "@/lib/data";
import { publicGiftUrl } from "@/lib/gifts/service";
import { orderRef } from "@/lib/orders/service";
import { demoCheckoutAvailable } from "@/lib/payments/checkout";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: "neutral" | "gold" | "teal" | "success" | "warning" | "danger" }> = {
  pending: { label: "Awaiting payment", tone: "neutral" },
  paid: { label: "Paid", tone: "success" },
  fulfilling: { label: "Being made", tone: "gold" },
  dispatched: { label: "Dispatched", tone: "teal" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "warning" },
  refunded: { label: "Refunded", tone: "warning" },
};

/** Order confirmation and status. Payment state comes from the webhook, never from the URL. */
export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const user = await requireUserOrRedirect(`/orders/${id}`);
  const store = getStore();
  const order = await store.orders.get(id);
  if (!order || order.ownerId !== user.id) notFound();
  const gift = await store.gifts.get(order.giftId);
  const s = STATUS[order.status] ?? STATUS.pending!;
  const physical = order.shippingAddress !== null;
  return (
    <AppShell narrow className="max-w-3xl">
      <p className="eyebrow">Order {orderRef(order)}</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">{order.status === "pending" ? "Confirming your payment" : order.status === "paid" || order.status === "fulfilling" || order.status === "dispatched" || order.status === "delivered" ? "Thank you" : s.label}</h1>
      <div className="mt-3 flex items-center gap-2">
        <Badge tone={s.tone}>{s.label}</Badge>
        {order.paymentProvider === "demo" ? <Badge tone="gold">Demo payment</Badge> : null}
      </div>

      {order.status === "pending" ? (
        <Notice tone="info" className="mt-6" title="We're waiting for your payment provider to confirm">
          This usually takes a few seconds. <Link href={`/orders/${order.id}`} className="font-semibold text-ocean underline-offset-4 hover:underline">Refresh</Link> to check again. If you closed the payment page, you can <Link href={`/checkout/${order.giftId}`} className="font-semibold text-ocean underline-offset-4 hover:underline">start again</Link> — nothing has been charged.
        </Notice>
      ) : null}

      <dl className="mt-8 space-y-2 rounded-xl border border-line bg-paper p-5 text-sm">
        {order.items.map((i) => (
          <div key={i.productId} className="flex justify-between"><dt className="text-text-muted">{i.name} × {i.quantity}</dt><dd>{formatPrice(i.unitPriceMinor * i.quantity)}</dd></div>
        ))}
        {order.shippingMinor ? <div className="flex justify-between"><dt className="text-text-muted">Delivery</dt><dd>{formatPrice(order.shippingMinor)}</dd></div> : null}
        <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink"><dt>Total</dt><dd>{formatPrice(order.totalMinor)}</dd></div>
        <div className="flex justify-between pt-1 text-xs text-text-faint"><dt>Placed</dt><dd>{new Date(order.createdAt).toLocaleString("en-GB")}</dd></div>
      </dl>

      {physical && order.shippingAddress ? (
        <section className="mt-6 rounded-xl border border-line bg-paper p-5 text-sm">
          <h2 className="text-lg">Delivery</h2>
          <p className="mt-2 whitespace-pre-line text-text-muted">{[order.shippingAddress.name, order.shippingAddress.line1, order.shippingAddress.line2, order.shippingAddress.city, order.shippingAddress.postcode].filter(Boolean).join("\n")}</p>
          <p className="mt-3">
            {order.fulfilment.status === "awaiting" && "We'll start making your keepsake shortly."}
            {order.fulfilment.status === "printing" && "Your message is being printed."}
            {order.fulfilment.status === "packed" && "Packed and ready to go."}
            {order.fulfilment.status === "dispatched" && `Dispatched${order.fulfilment.carrier ? ` with ${order.fulfilment.carrier}` : ""}${order.fulfilment.trackingNumber ? ` · tracking ${order.fulfilment.trackingNumber}` : ""}.`}
            {order.fulfilment.status === "delivered" && "Delivered."}
          </p>
        </section>
      ) : null}

      {gift && gift.story && order.status !== "pending" && order.status !== "cancelled" ? (
        <section className="mt-8 rounded-xl border border-line bg-paper p-5">
          <h2 className="text-xl">Share the story</h2>
          <div className="mt-4">
            <SharePanel giftId={gift.id} status={gift.status} url={publicGiftUrl(gift)} recipientName={gift.input.recipientName} demoMode={demoCheckoutAvailable()} checkoutAvailable={env.stripeConfigured || demoCheckoutAvailable()} hasPaidOrder openCount={gift.openCount} lastOpenedAt={gift.lastOpenedAt} emailAvailable={env.emailConfigured} />
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {gift ? <Button href={`/gifts/${gift.id}`} variant="secondary">Back to the gift</Button> : null}
        <Button href="/dashboard" variant="ghost">My gifts</Button>
      </div>
    </AppShell>
  );
}
