import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { GlowingBottle } from "@/components/art/GlowingBottle";
import { SceneArt } from "@/components/art/SceneArt";
import { formatPrice, isInSeason } from "@/lib/config/products";
import { getProduct } from "@/lib/config/catalogue";

const FEATURES = [
  { title: "Your Christmas card, inside", body: "Your message printed as a card, rolled and tied with red ribbon and holly." },
  { title: "A festive fragrance", body: "Winter spice, fireside pine, or unscented. The season, the moment it's uncorked." },
  { title: "A carol, just for them", body: "Silent Night, Jingle Bells and more, with new words that sing their names." },
  { title: "From the family, or for it", body: "Send it to Grandma and Grandad, or from all of you to someone far away." },
];

const DIGITAL_SEASON = { from: "10-01", until: "12-26", label: "Christmas" };

const DIGITAL_FEATURES = [
  { title: "A Christmas story, illustrated", body: "Your message shaped into scenes of snow, fir trees and fairy lights." },
  { title: "A carol, just for them", body: "Silent Night, Jingle Bells and more, with new words that sing their names." },
  { title: "A bottle that glows", body: "It uncorks on their screen, wherever in the world they are." },
  { title: "From the family, or for it", body: "Send it to Grandma and Grandad, or from all of you to someone far away." },
];

/**
 * Seasonal section; renders nothing outside the Christmas window. Shows the
 * Christmas Bottle when physical products are on, otherwise the digital
 * Christmas story.
 */
export function ChristmasSection() {
  const product = getProduct("christmas-bottle");
  // The digital story can be sent right up to Christmas; the bottle stops at the last posting date.
  if (!product && !isInSeason({ season: DIGITAL_SEASON })) return null;
  const digital = getProduct("digital");
  return (
    <section id="christmas" className="relative scroll-mt-20 overflow-hidden bg-[#122820] py-16 text-text-on-dark sm:py-24">
      <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
        <SceneArt spec={{ theme: "winter", motif: "fir", timeOfDay: "night", seed: 1225 }} alt="" className="scale-110" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#122820] via-[#122820]/85 to-[#122820]/30" aria-hidden />
      <div className="container-page relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#f2c46d]">{product ? "Seasonal · The Christmas Bottle" : "Seasonal · Christmas"}</p>
          <h2 className="mt-3 text-3xl text-text-on-dark sm:text-5xl">{product ? "A Christmas card that glows, smells of the season, and sings." : "A Christmas card that glows, opens, and sings."}</h2>
          <p className="mt-4 max-w-xl font-hand text-2xl text-[#f2c46d] sm:text-3xl">Merry Christmas, from all of us.</p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {(product ? FEATURES : DIGITAL_FEATURES).map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#b8403a] ring-4 ring-[#b8403a]/25" aria-hidden />
                <span>
                  <span className="block font-semibold text-text-on-dark">{f.title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-text-on-dark-muted">{f.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button href={product ? "/create?occasion=christmas&product=christmas-bottle&theme=winter" : "/create?occasion=christmas&theme=winter"} size="lg" variant="gold">
              {product ? "Create a Christmas bottle" : "Create a Christmas gift"}
            </Button>
            {product ? (
              <p className="text-sm text-text-on-dark-muted">
                <span className="font-display text-2xl text-text-on-dark">{formatPrice(product.priceMinor)}</span> + {formatPrice(product.shippingMinor)} UK delivery
              </p>
            ) : digital ? (
              <p className="text-sm text-text-on-dark-muted">
                <span className="font-display text-2xl text-text-on-dark">{formatPrice(digital.priceMinor)}</span> to send, by private link
              </p>
            ) : null}
          </div>
          {product ? (
            <p className="mt-4 text-xs text-text-on-dark-muted">Made to order in the UK; we confirm dispatch by email. Available until {product.season ? new Date(`2000-${product.season.until}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "Christmas"}. The digital Christmas story can be sent any time.</p>
          ) : (
            <p className="mt-4 text-xs text-text-on-dark-muted">Opens on any phone, no app or account needed. Preview the whole thing before you pay.</p>
          )}
        </Reveal>
        <Reveal delay={150} className="relative mx-auto flex w-full max-w-sm justify-center">
          <div className="absolute inset-0 rounded-full halo blur-2xl" aria-hidden />
          <GlowingBottle festive className="relative h-[22rem] w-auto drop-shadow-[0_24px_40px_rgba(242,196,109,0.35)] sm:h-[26rem]" />
          <div className="absolute -left-2 bottom-10 rotate-[-6deg] rounded-md bg-[#f7f1e6] px-4 py-3 shadow-lift sm:-left-8">
            <p className="font-hand text-xl leading-tight text-[#8f2f2a]">Silent night, Christmas night…</p>
            <p className="mt-1 text-[0.65rem] uppercase tracking-[0.16em] text-[#5b4717]">A carol for the Patels</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
