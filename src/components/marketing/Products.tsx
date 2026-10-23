import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { SceneArt } from "@/components/art/SceneArt";
import { formatPrice } from "@/lib/config/products";
import { listProducts, physicalProductsEnabled } from "@/lib/config/catalogue";
import { cn } from "@/lib/utils/cn";
import bottlePhoto from "@/assets/brand/bottle-keepsake.jpg";
import boxPhoto from "@/assets/brand/box-closed.jpg";

export function Products({ heading = true }: { heading?: boolean }) {
  const products = listProducts({ seasonal: false });
  const physical = physicalProductsEnabled();
  return (
    <section id="pricing" className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-page">
        {heading ? (
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{physical ? "Digital and physical" : "One simple price"}</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">{physical ? "Send the story. Or send the bottle." : `Free to make. ${formatPrice(products[0]?.priceMinor ?? 499)} to send.`}</h2>
            <p className="mt-4 text-text-muted">{physical ? "Every gift starts with the digital story. Add a real keepsake bottle when you want something to hold." : "Create and preview the whole gift before you pay. No subscription."}</p>
          </Reveal>
        ) : null}
        <div className={cn("grid gap-5", physical ? "lg:grid-cols-3" : "max-w-4xl md:grid-cols-2", heading && "mt-10")}>
          {products.map((p, i) => {
            const signature = physical ? p.id === "little-bottle" : p.id === "digital";
            return (
              <Reveal as="article" key={p.id} delay={i * 110} className={cn("relative flex flex-col overflow-hidden rounded-2xl border bg-paper shadow-soft", signature ? "border-gold/60 shadow-glow" : "border-line")}>
                <div className="relative aspect-[16/10] overflow-hidden">
                  {p.id === "digital" ? (
                    <SceneArt spec={{ theme: "ocean", motif: "bottle", timeOfDay: "night", seed: 4821 }} alt="" />
                  ) : (
                    <Image src={p.id === "little-bottle" ? bottlePhoto : boxPhoto} alt={p.id === "little-bottle" ? "A small glass bottle lit with fairy lights on a wooden table" : "A kraft keepsake gift box"} placeholder="blur" sizes="(min-width: 1024px) 33vw, 100vw" className="h-full w-full object-cover" />
                  )}
                  {p.badge ? (
                    <Badge tone={signature ? "gold" : "teal"} className="absolute right-4 top-4 shadow-soft">
                      {p.badge}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-2xl">{p.name}</h3>
                  <p className="mt-1 text-sm text-text-muted">{p.tagline}</p>
                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="font-display text-4xl text-ink">{formatPrice(p.priceMinor)}</span>
                    {p.requiresShipping ? <span className="text-xs text-text-faint">{p.shippingMinor > 0 ? `+ ${formatPrice(p.shippingMinor)} UK delivery` : "UK delivery included"}</span> : <span className="text-xs text-text-faint">one-off</span>}
                  </p>
                  <ul className="mt-5 space-y-2 text-sm text-text-muted">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2.5">
                        <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m5 10.5 3.2 3L15 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-6">
                    <Button href={`/create?product=${p.id}`} variant={signature ? "gold" : "secondary"} fullWidth>
                      Start with {p.kind === "digital" ? "the story" : `the ${p.name.toLowerCase()}`}
                    </Button>
                  </div>
                </div>
              </Reveal>
            );
          })}
          {!physical ? (
            <Reveal as="article" delay={110} className="relative flex flex-col overflow-hidden rounded-2xl border border-dashed border-line-strong bg-paper/60">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image src={bottlePhoto} alt="A small glass bottle lit with fairy lights on a wooden table" placeholder="blur" sizes="(min-width: 768px) 50vw, 100vw" className="h-full w-full object-cover opacity-80 saturate-[0.85]" />
                <Badge tone="neutral" className="absolute right-4 top-4 shadow-soft">Coming soon</Badge>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-2xl">Keepsake bottles</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">Your message printed and rolled inside a glowing glass bottle, with a card that opens the story. We&apos;re getting these just right, and they aren&apos;t on sale yet.</p>
                <p className="mt-auto pt-6 text-sm text-text-muted">Until then, every gift comes with a QR code you can print on a card of your own.</p>
              </div>
            </Reveal>
          ) : null}
        </div>
        <p className="mt-6 text-xs text-text-faint">
          Prices in GBP, including VAT where applicable. You preview the finished story before paying.{physical ? " Physical items are made to order and shipped within the UK; delivery estimates are shown at checkout." : ""}
        </p>
      </div>
    </section>
  );
}
