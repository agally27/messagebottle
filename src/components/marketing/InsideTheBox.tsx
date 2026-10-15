import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import boxClosed from "@/assets/brand/box-closed.jpg";
import boxOpen from "@/assets/brand/box-open.jpg";
import scanPhone from "@/assets/brand/scan-phone.jpg";

const STEPS = [
  { n: "1", title: "Beautifully packaged", body: "A kraft gift box, tied with twine and a wooden heart, with your recipient's name on the card.", img: boxClosed, alt: "A kraft gift box tied with twine and a small wooden heart" },
  { n: "2", title: "Inside they'll find", body: "A small glass bottle lit from within, your message rolled inside, and a card with the code to the story.", img: boxOpen, alt: "An open gift box with a lit glass bottle, a note and a QR code card nestled in paper straw" },
  { n: "3", title: "Scan & discover", body: "One scan opens the illustrated story on their phone, with the soundtrack you chose. No app, no account.", img: scanPhone, alt: "A hand holding a phone showing an illustrated sunset story" },
] as const;

export function InsideTheBox() {
  return (
    <section id="the-bottle" className="scroll-mt-20 kraft py-16 sm:py-24">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">The Little Bottle</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">A gift they can hold. A story they can open.</h2>
          <p className="mt-4 text-text-muted">Every physical gift holds the digital story. Open the box, lift the bottle, scan the card — and the words you wrote come to life.</p>
        </Reveal>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 120} className="overflow-hidden rounded-2xl bg-paper shadow-photo ring-1 ring-black/5">
              <div className="relative aspect-[11/10] overflow-hidden">
                <Image src={s.img} alt={s.alt} placeholder="blur" sizes="(min-width: 768px) 33vw, 100vw" className="h-full w-full object-cover transition-transform duration-700 ease-out-soft hover:scale-[1.03] motion-reduce:transform-none" />
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-paper/95 font-display text-lg text-ink shadow-soft">{s.n}</span>
              </div>
              <div className="p-5">
                <h3 className="text-xl">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
        <Reveal className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-hand text-2xl text-[#5b4717] sm:text-3xl">A little bottle with a big feeling.</p>
          <Button href="/create?product=little-bottle" size="lg">
            Start with the Little Bottle
          </Button>
        </Reveal>
        <p className="mt-6 text-xs text-text-muted">Product photography shown is indicative; the finished bottle and packaging may vary slightly.</p>
      </div>
    </section>
  );
}
