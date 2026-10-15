import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, listProducts } from "@/lib/config/products";
import { cn } from "@/lib/utils/cn";

export function Products({ heading = true }: { heading?: boolean }) {
  const products = listProducts();
  return (
    <section id="pricing" className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-page">
        {heading ? (
          <div className="max-w-2xl">
            <p className="eyebrow">Digital and physical</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Send the story. Or send the bottle.</h2>
            <p className="mt-4 text-text-muted">Every gift starts with the digital story. Add a real keepsake bottle when you want something to hold.</p>
          </div>
        ) : null}
        <div className={cn("grid gap-5 lg:grid-cols-3", heading && "mt-10")}>
          {products.map((p) => {
            const signature = p.id === "little-bottle";
            return (
              <article key={p.id} className={cn("relative flex flex-col rounded-xl border bg-paper p-6 shadow-soft", signature ? "border-gold/60 shadow-glow" : "border-line")}>
                {p.badge ? (
                  <Badge tone={signature ? "gold" : "teal"} className="absolute right-5 top-5">
                    {p.badge}
                  </Badge>
                ) : null}
                <h3 className="text-2xl">{p.name}</h3>
                <p className="mt-1 text-sm text-text-muted">{p.tagline}</p>
                <p className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl text-ink">{formatPrice(p.priceMinor)}</span>
                  {p.requiresShipping ? <span className="text-xs text-text-faint">{p.shippingMinor > 0 ? `+ ${formatPrice(p.shippingMinor)} UK delivery` : "UK delivery included"}</span> : <span className="text-xs text-text-faint">one-off</span>}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-text-muted">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-teal" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m5 10.5 3.2 3L15 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-2 mt-auto">
                  <Button href={`/create?product=${p.id}`} variant={signature ? "primary" : "secondary"} fullWidth>
                    Start with {p.kind === "digital" ? "the story" : `the ${p.name.toLowerCase()}`}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-text-faint">
          Prices in GBP, including VAT where applicable. You preview the finished story before paying. Physical items are made to order and shipped within the UK; delivery estimates are shown at checkout.
        </p>
      </div>
    </section>
  );
}
