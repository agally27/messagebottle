import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { GlowingBottle } from "@/components/art/GlowingBottle";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full halo opacity-70 blur-2xl" aria-hidden />
      <Reveal className="container-narrow relative text-center">
        <GlowingBottle className="mx-auto h-40 w-auto" />
        <p className="mt-4 eyebrow">Begin</p>
        <h2 className="mt-3 text-3xl sm:text-5xl">Say the thing you&apos;ve been meaning to say.</h2>
        <p className="mx-auto mt-4 max-w-md text-text-muted">It takes about ten minutes. You can save a draft and come back.</p>
        <div className="mt-8 flex justify-center">
          <Button href="/create" size="lg" variant="gold" className="shadow-warm">
            Create your gift
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
