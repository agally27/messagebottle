import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { GlowingBottle } from "@/components/art/GlowingBottle";
import recipient from "@/assets/brand/recipient-holding.jpg";

export function BrandMoment() {
  return (
    <section className="relative overflow-hidden bg-ink py-20 text-text-on-dark sm:py-28">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full halo opacity-40 blur-3xl" aria-hidden />
      <div className="container-page relative grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
        <Reveal>
          <p className="font-hand text-3xl leading-snug text-glow sm:text-4xl">Because some people just deserve to feel special…</p>
          <h2 className="mt-5 text-3xl text-text-on-dark sm:text-5xl">The moment they open it.</h2>
          <p className="mt-5 max-w-lg text-text-on-dark-muted">A quiet screen. Their name. A bottle that opens. Then your words, scene by scene, with the music you chose. It takes three minutes, and it stays with them.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/example" variant="gold" size="lg">
              Open an example
            </Button>
            <Button href="/create" variant="onDark" size="lg">
              Create your gift
            </Button>
          </div>
        </Reveal>
        <Reveal delay={150} className="relative mx-auto flex w-full max-w-md items-end justify-center">
          <div className="relative w-[78%] rotate-[-3deg] rounded-md bg-paper p-3 pb-10 shadow-lift">
            <Image src={recipient} alt="A woman smiling as she holds a small glowing bottle" placeholder="blur" sizes="(min-width: 1024px) 360px, 70vw" className="aspect-[5/4] w-full rounded-sm object-cover" />
            <p className="mt-3 text-center font-hand text-2xl text-[#5b4717]">For you, always.</p>
          </div>
          <GlowingBottle className="absolute -bottom-6 -right-2 h-56 w-auto drop-shadow-[0_20px_30px_rgba(240,180,94,0.35)] sm:-right-6 sm:h-72" />
        </Reveal>
      </div>
    </section>
  );
}
