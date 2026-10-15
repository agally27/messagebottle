import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/site/AppShell";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { completeDemoPaymentAction } from "@/lib/actions/orders";
import { requireUserOrRedirect } from "@/lib/auth/guards";
import { formatPrice } from "@/lib/config/products";
import { getStore } from "@/lib/data";
import { demoCheckoutAvailable } from "@/lib/payments/checkout";

export const metadata: Metadata = { title: "Demo payment", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Stand-in for the Stripe-hosted page. Exists only in demo mode. */
export default async function DemoPaymentPage({ params, searchParams }: PageProps<"/checkout/[giftId]/demo/[orderId]">) {
  const { giftId, orderId } = await params;
  const sp = await searchParams;
  const user = await requireUserOrRedirect(`/checkout/${giftId}/demo/${orderId}`);
  if (!demoCheckoutAvailable()) notFound();
  const order = await getStore().orders.get(orderId);
  if (!order || order.ownerId !== user.id || order.giftId !== giftId) notFound();
  if (order.status !== "pending") redirect(`/orders/${order.id}`);
  const complete = async () => {
    "use server";
    const r = await completeDemoPaymentAction(order.id);
    if (r && !r.ok) redirect(`/checkout/${giftId}/demo/${order.id}?error=${encodeURIComponent(r.error)}`);
  };
  return (
    <AppShell narrow className="max-w-md">
      <p className="eyebrow">Demo payment</p>
      <h1 className="mt-2 text-3xl">Simulated card payment</h1>
      <Notice tone="demo" className="mt-4" title="Nothing is charged">
        This page stands in for Stripe&apos;s hosted checkout. Confirming marks the order as paid and activates the gift link, exactly as a real payment would.
      </Notice>
      <dl className="mt-6 space-y-2 rounded-xl border border-line bg-paper p-5 text-sm">
        {order.items.map((i) => (
          <div key={i.productId} className="flex justify-between"><dt>{i.name} × {i.quantity}</dt><dd>{formatPrice(i.unitPriceMinor * i.quantity)}</dd></div>
        ))}
        {order.shippingMinor ? <div className="flex justify-between"><dt>Delivery</dt><dd>{formatPrice(order.shippingMinor)}</dd></div> : null}
        <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink"><dt>Total</dt><dd>{formatPrice(order.totalMinor)}</dd></div>
      </dl>
      {typeof sp.error === "string" ? <Notice tone="danger" className="mt-4">{sp.error}</Notice> : null}
      <form action={complete} className="mt-6 flex flex-col gap-3">
        <Button type="submit" size="lg" fullWidth>
          Confirm demo payment of {formatPrice(order.totalMinor)}
        </Button>
        <Button href={`/checkout/${giftId}?cancelled=1`} variant="ghost" fullWidth>
          Cancel
        </Button>
      </form>
    </AppShell>
  );
}
