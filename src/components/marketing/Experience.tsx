import { SceneArt } from "@/components/art/SceneArt";
import { THEMES } from "@/lib/domain/themes";
import { Reveal } from "@/components/ui/Reveal";

export function Experience() {
  return (
    <section id="experience" className="scroll-mt-20 bg-ink py-16 text-text-on-dark sm:py-24">
      <div className="container-page">
        <Reveal className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <p className="eyebrow text-seaglass">The experience</p>
            <h2 className="mt-3 text-3xl text-text-on-dark sm:text-4xl">Opened like a gift. Kept like a letter.</h2>
            <p className="mt-4 text-text-on-dark-muted">A quiet opening, a reveal, then your story scene by scene — with the look and sound you chose. Six visual styles, each with its own light.</p>
          </div>
        </Reveal>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {THEMES.map((t, i) => (
            <li key={t.id} className="overflow-hidden rounded-lg ring-1 ring-white/10">
              <div className="aspect-[3/4]">
                <SceneArt spec={{ theme: t.id, motif: (["bottle", "lantern", "shore", "letter", "boat", "window", "fir"] as const)[i % 7]!, timeOfDay: (["night", "dusk", "day", "day", "dawn", "dusk", "night"] as const)[i % 7]!, seed: 100 + i }} alt={`${t.name} style preview`} />
              </div>
              <p className="px-3 py-2.5 text-xs font-medium text-text-on-dark-muted">{t.name}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
