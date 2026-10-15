import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SceneArt } from "@/components/art/SceneArt";
import { formatPrice, getProduct } from "@/lib/config/products";
import type { SceneArtSpec } from "@/lib/domain/types";

const USES = [
  { title: "Two people, years on", body: "How you met, the flat with the wonky door, the trip that went wrong in the best way. A story only the two of you could read." },
  { title: "The photos and the song", body: "Up to twelve photos as a then-and-now timeline, and the song that was always yours, ready to play at the end." },
  { title: "In loving memory", body: "Celebrate someone who has passed: their name and years, gently, with the photos and the music they loved, for the people who miss them." },
];

/** Illustrated stand-ins for photos (the landing page never shows real customers' pictures). */
const POLAROIDS: Array<{ spec: SceneArtSpec; year: string; caption: string; tilt: string }> = [
  { spec: { theme: "watercolour", motif: "lantern", timeOfDay: "night", seed: 1998 }, year: "1998", caption: "The night we met", tilt: "-rotate-3" },
  { spec: { theme: "storybook", motif: "city", timeOfDay: "dusk", seed: 2006 }, year: "2006", caption: "Our first flat", tilt: "rotate-2" },
  { spec: { theme: "ocean", motif: "shore", timeOfDay: "day", seed: 2024 }, year: "Now", caption: "Still us", tilt: "-rotate-1" },
];

export function MemorySection() {
  const product = getProduct("memory-bottle");
  return (
    <section id="memories" className="relative scroll-mt-20 overflow-hidden bg-sand py-16 sm:py-24">
      <div className="container-page grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        <Reveal className="relative order-2 mx-auto w-full max-w-md lg:order-1">
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {POLAROIDS.map((p, i) => (
              <figure key={p.year} className={`rounded-sm bg-white p-2.5 pb-3 shadow-lift ring-1 ring-black/5 ${p.tilt} ${i === 2 ? "col-span-2 ml-1 w-[46%] sm:mx-auto sm:w-1/2" : ""}`}>
                <div className="aspect-square overflow-hidden bg-sand-deep">
                  <SceneArt spec={p.spec} alt="" className="h-full w-full" />
                </div>
                <figcaption className="mt-2 px-0.5 font-hand text-xl leading-tight text-ink">
                  <span className="mr-1.5 font-sans text-[0.65rem] font-semibold tracking-wide text-text-muted">{p.year}</span>
                  {p.caption}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="absolute -bottom-6 right-0 w-52 rotate-2 sm:-right-8 sm:w-60 rounded-xl bg-ink p-4 text-text-on-dark shadow-lift">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-gold">Our song</p>
            <p className="mt-1 font-display text-lg leading-tight">The one from the kitchen</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-ink" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="flex h-6 flex-1 items-end gap-[3px]" aria-hidden>
                {[5, 9, 14, 8, 17, 11, 6, 13, 18, 9, 12, 7, 15, 10].map((h, i) => (
                  <span key={i} className="w-full rounded-full bg-seaglass/80" style={{ height: `${h + 4}px` }} />
                ))}
              </span>
            </div>
            <p className="mt-2 text-[0.65rem] text-text-on-dark-muted">Plays from Spotify, Apple Music or YouTube</p>
          </div>
        </Reveal>

        <Reveal delay={120} className="order-1 lg:order-2">
          <p className="eyebrow">New · Memory in a Bottle</p>
          <h2 className="mt-3 text-3xl sm:text-5xl">Some messages are made of memories.</h2>
          <p className="mt-4 max-w-xl text-lg text-text-muted">Add the photos, the years and the song. We weave them into the story, so opening it feels like turning the pages of something you made together.</p>
          <ul className="mt-8 space-y-5">
            {USES.map((u) => (
              <li key={u.title} className="flex gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gold ring-4 ring-gold/25" aria-hidden />
                <span>
                  <span className="block font-semibold text-ink">{u.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-text-muted">{u.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button href={`/create?occasion=memories${product ? "&product=memory-bottle" : ""}`} size="lg">
              Bottle a memory
            </Button>
            <Button href="/create?occasion=remembrance" size="lg" variant="secondary">
              Remember someone
            </Button>
          </div>
          {product ? (
            <p className="mt-5 text-sm text-text-muted">
              Memory Bottle <span className="font-display text-lg text-ink">{formatPrice(product.priceMinor)}</span> + {formatPrice(product.shippingMinor)} UK delivery: your message and three mini photo prints, tied with twine. Or send it digitally from {formatPrice(getProduct("digital")?.priceMinor ?? 0)}.
            </p>
          ) : null}
          <p className="mt-3 text-xs text-text-faint">Photos stay private to the gift: location data is removed, and only someone with the private link can see them.</p>
        </Reveal>
      </div>
    </section>
  );
}
