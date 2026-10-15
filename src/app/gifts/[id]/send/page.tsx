import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/site/AppShell";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { requireUserOrRedirect } from "@/lib/auth/guards";
import { env } from "@/lib/config/env";
import { getStore } from "@/lib/data";
import { formatPrice, listProducts } from "@/lib/config/products";

export const metadata: Metadata = { title: "Send your gift", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Product choice before checkout. Checkout itself arrives in milestone 6. */
export default async function SendPage({ params }: PageProps<"/gifts/[id]/send">) {
  const { id } = await params;
  const user = await requireUserOrRedirect(`/gifts/${id}/send`);
  const gift = await getStore().gifts.get(id);
  if (!gift || gift.ownerId !== user.id) notFound();
  if (!gift.story) redirect(`/gifts/${id}`);
  const products = listProducts();
  return (
    <AppShell narrow className="max-w-4xl">
      <p className="eyebrow">For {gift.input.recipientName}</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Choose how to send it</h1>
      <p className="mt-3 text-text-muted">Every option includes the digital story and private link.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="flex flex-col rounded-xl border border-line bg-paper p-5">
            <h2 className="text-xl">{p.name}</h2>
            <p className="mt-1 text-sm text-text-muted">{p.tagline}</p>
            <p className="mt-4 font-display text-3xl text-ink">{formatPrice(p.priceMinor)}</p>
            {p.requiresShipping ? <p className="text-xs text-text-faint">{p.shippingMinor ? `+ ${formatPrice(p.shippingMinor)} UK delivery` : "UK delivery included"}</p> : null}
            <div className="mt-5 mt-auto pt-4">
              <Button href={`/checkout/${gift.id}?product=${p.id}`} fullWidth variant={p.id === gift.productId ? "primary" : "secondary"} aria-disabled={!env.stripeConfigured && !env.demoMode}>
                Continue
              </Button>
            </div>
          </div>
        ))}
      </div>
      {!env.stripeConfigured ? (
        <Notice tone={env.demoMode ? "demo" : "warning"} className="mt-6">
          {env.demoMode ? "Payments are not configured in this environment. Checkout runs in demonstration mode and no card is charged." : "Payments are not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable checkout."}
        </Notice>
      ) : null}
      <p className="mt-6 text-sm text-text-muted">
        <a href={`/gifts/${gift.id}`} className="font-semibold text-ocean underline-offset-4 hover:underline">← Back to the gift</a>
      </p>
    </AppShell>
  );
}
