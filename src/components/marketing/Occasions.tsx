import Link from "next/link";
import { OCCASIONS } from "@/lib/domain/occasions";
import { SceneArt } from "@/components/art/SceneArt";
import type { Motif, ThemeId, TimeOfDay } from "@/lib/domain/types";

const ART: Record<string, { theme: ThemeId; motif: Motif; time: TimeOfDay; seed: number }> = {
  love: { theme: "cinematic", motif: "lantern", time: "dusk", seed: 11 },
  birthday: { theme: "storybook", motif: "garden", time: "day", seed: 12 },
  family: { theme: "keepsake", motif: "window", time: "dusk", seed: 13 },
  friendship: { theme: "watercolour", motif: "path", time: "day", seed: 14 },
  "thank-you": { theme: "minimal", motif: "letter", time: "day", seed: 15 },
  encouragement: { theme: "ocean", motif: "boat", time: "dawn", seed: 16 },
  memories: { theme: "watercolour", motif: "shore", time: "dusk", seed: 17 },
  remembrance: { theme: "minimal", motif: "stars", time: "night", seed: 18 },
  "just-because": { theme: "storybook", motif: "tree", time: "day", seed: 19 },
};

export function Occasions() {
  const items = OCCASIONS.filter((o) => o.id !== "other");
  return (
    <section id="occasions" className="scroll-mt-20 bg-paper py-16 sm:py-24 border-y border-line">
      <div className="container-page">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Occasions</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">For the moments that deserve more than a text.</h2>
          </div>
          <p className="max-w-sm text-sm text-text-muted">One gentle flow for every occasion. The story, imagery and language adapt to the moment — including the difficult ones.</p>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
          {items.map((o) => {
            const art = ART[o.id] ?? { theme: "minimal" as ThemeId, motif: "shore" as Motif, time: "day" as TimeOfDay, seed: 1 };
            return (
              <li key={o.id}>
                <Link href={`/create?occasion=${o.id}`} className="group block overflow-hidden rounded-xl border border-line bg-cream shadow-soft transition-shadow hover:shadow-lift focus-visible:shadow-lift">
                  <div className="aspect-[4/3] overflow-hidden">
                    <SceneArt spec={{ theme: art.theme, motif: art.motif, timeOfDay: art.time, seed: art.seed }} alt="" className="transition-transform duration-700 ease-out-soft group-hover:scale-[1.04] motion-reduce:transform-none" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-lg text-ink">{o.label}</h3>
                    <p className="mt-1 hidden text-sm leading-snug text-text-muted sm:block">{o.description}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
