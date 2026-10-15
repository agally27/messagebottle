import { Button } from "@/components/ui/Button";
import { SceneArt } from "@/components/art/SceneArt";

export function Hero() {
  return (
    <section className="relative overflow-hidden paper-texture">
      <div className="container-page grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-28">
        <div className="max-w-xl animate-fade-up">
          <p className="eyebrow">Personalised digital gifts</p>
          <h1 className="mt-4 text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.4rem]">
            A feeling, <span className="italic font-light text-ocean">in a bottle.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-text-muted sm:text-xl">
            Write a message to someone you love. We turn it into a personalised story with music and illustrations they can open anywhere — and, if you like, a real bottle to keep it in.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href="/create" size="lg">
              Create your gift
            </Button>
            <Button href="/example" variant="secondary" size="lg">
              Open an example
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted">
            <li className="flex items-center gap-2"><Dot /> Ready in minutes</li>
            <li className="flex items-center gap-2"><Dot /> No app for them to install</li>
            <li className="flex items-center gap-2"><Dot /> You approve every word</li>
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none animate-fade-in" style={{ animationDelay: "150ms" }}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-lift ring-1 ring-ink/10 sm:aspect-[5/6]">
            <SceneArt spec={{ theme: "ocean", motif: "bottle", timeOfDay: "night", seed: 4821 }} alt="A bottle drifting on moonlit water" className="animate-drift motion-reduce:animate-none scale-[1.06]" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <div className="rounded-xl bg-paper/90 p-5 shadow-card backdrop-blur-sm sm:p-6">
                <p className="eyebrow">For Eleanor</p>
                <p className="mt-2 font-display text-2xl leading-snug text-ink sm:text-[1.7rem]">
                  Someone has a message for you.
                </p>
                <p className="mt-2 text-sm text-text-muted">A story in six scenes, with gentle piano. From Tom.</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-text-on-dark">Open the bottle</span>
                  <span className="text-xs text-text-faint">About 3 minutes</span>
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -left-6 top-10 hidden h-28 w-28 rounded-full bg-gold/20 blur-2xl lg:block" aria-hidden />
          <div className="pointer-events-none absolute -right-8 bottom-16 hidden h-36 w-36 rounded-full bg-teal/20 blur-3xl lg:block" aria-hidden />
        </div>
      </div>
    </section>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />;
}
