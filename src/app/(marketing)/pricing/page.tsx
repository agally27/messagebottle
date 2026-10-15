import type { Metadata } from "next";
import { Products } from "@/components/marketing/Products";
import { FAQ } from "@/components/marketing/FAQ";

export const metadata: Metadata = { title: "Pricing", description: "Digital stories from £4.99. Keepsake bottles and gift boxes with your message inside." };

export default function PricingPage() {
  return (
    <>
      <section className="paper-texture py-14 sm:py-20">
        <div className="container-page max-w-3xl">
          <p className="eyebrow">Pricing</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Simple, one-off prices.</h1>
          <p className="mt-4 text-lg text-text-muted">No subscription. Create and preview your gift for free; pay only when you&apos;re ready to send it.</p>
        </div>
      </section>
      <Products heading={false} />
      <FAQ />
    </>
  );
}
