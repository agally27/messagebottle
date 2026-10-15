import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FulfilmentForm } from "@/components/admin/FulfilmentForm";
import { requireAdminOrNotFound } from "@/lib/auth/guards";
import { describeOptions, formatPrice } from "@/lib/config/products";
import { getStore } from "@/lib/data";
import { orderRef } from "@/lib/orders/service";

export const metadata: Metadata = { title: "Order", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminOrder({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdminOrNotFound("/admin/orders/[id]");
  const { id } = await params;
  const store = getStore();
  const order = await store.orders.get(id);
  if (!order) notFound();
  const gift = await store.gifts.get(order.giftId);
  const physical = order.shippingAddress !== null;
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <p className="eyebrow">Order</p>
        <h1 className="mt-1 text-3xl">{orderRef(order)}</h1>
        <div className="mt-2 flex gap-2"><Badge tone="neutral">{order.status}</Badge>{order.paymentProvider ? <Badge tone="gold">{order.paymentProvider}</Badge> : null}</div>
        <dl className="mt-6 space-y-2 rounded-xl border border-line bg-paper p-5 text-sm">
          {order.items.map((i) => <div key={i.productId} className="flex justify-between"><dt>{i.name}{describeOptions(i.productId, i.options) ? ` · ${describeOptions(i.productId, i.options)}` : ""} × {i.quantity}</dt><dd>{formatPrice(i.unitPriceMinor * i.quantity)}</dd></div>)}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{formatPrice(order.shippingMinor)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd>{formatPrice(order.totalMinor)}</dd></div>
          <div className="flex justify-between text-xs text-text-faint"><dt>Stripe session</dt><dd className="font-mono">{order.stripeCheckoutSessionId ?? "—"}</dd></div>
          <div className="flex justify-between text-xs text-text-faint"><dt>Paid</dt><dd>{order.paidAt ? new Date(order.paidAt).toLocaleString("en-GB") : "—"}</dd></div>
        </dl>
        {physical && order.shippingAddress ? (
          <section className="mt-6 rounded-xl border border-line bg-paper p-5 text-sm">
            <h2 className="text-lg">Ship to</h2>
            <p className="mt-2 whitespace-pre-line">{[order.shippingAddress.name, order.shippingAddress.line1, order.shippingAddress.line2, order.shippingAddress.city, order.shippingAddress.postcode, order.shippingAddress.country].filter(Boolean).join("\n")}</p>
            {order.shippingAddress.giftNote ? <p className="mt-3 text-text-muted">Gift note: “{order.shippingAddress.giftNote}”</p> : null}
          </section>
        ) : null}
        {gift ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button href={`/gifts/${gift.id}/print`} variant="secondary" size="sm" target="_blank" rel="noopener">Print-ready message</Button>
            <Button href={`/api/gifts/${gift.id}/qr?size=1024`} variant="secondary" size="sm" target="_blank" rel="noopener">QR code (PNG)</Button>
          </div>
        ) : <p className="mt-4 text-sm text-danger">The gift for this order no longer exists.</p>}
      </div>
      <div>
        <h2 className="text-2xl">Fulfilment</h2>
        {physical ? (
          <div className="mt-4"><FulfilmentForm orderId={order.id} fulfilment={order.fulfilment} orderStatus={order.status} /></div>
        ) : (
          <p className="mt-2 text-sm text-text-muted">Digital only — nothing to ship. The private link was activated on payment.</p>
        )}
      </div>
    </div>
  );
}
