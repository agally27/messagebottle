import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/site/AppShell";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Notice } from "@/components/ui/Notice";
import { requireUserOrRedirect } from "@/lib/auth/guards";
import { env } from "@/lib/config/env";
import { listProducts } from "@/lib/config/catalogue";
import { getStore } from "@/lib/data";
import { demoCheckoutAvailable } from "@/lib/payments/checkout";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params, searchParams }: PageProps<"/checkout/[giftId]">) {
  const { giftId } = await params;
  const sp = await searchParams;
  const user = await requireUserOrRedirect(`/checkout/${giftId}`);
  const gift = await getStore().gifts.get(giftId);
  if (!gift || gift.ownerId !== user.id) notFound();
  if (!gift.story) redirect(`/gifts/${giftId}`);
  const mode = env.stripeConfigured ? "stripe" : demoCheckoutAvailable() ? "demo" : "unavailable";
  const initialProduct = typeof sp.product === "string" ? sp.product : (gift.productId ?? "digital");
  return (
    <AppShell className="max-w-5xl">
      <p className="eyebrow">For {gift.input.recipientName}</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Checkout</h1>
      {sp.cancelled ? <Notice tone="info" className="mt-4">Payment was cancelled. Nothing has been charged; pick up where you left off.</Notice> : null}
      <div className="mt-8">
        <CheckoutForm giftId={gift.id} products={listProducts()} initialProductId={initialProduct} recipientName={gift.input.recipientName} mode={mode} photoCount={gift.photos?.length ?? 0} />
      </div>
    </AppShell>
  );
}
