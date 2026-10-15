import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { SceneArt } from "@/components/art/SceneArt";
import { PhoneMockup } from "./PhoneMockup";
import { Reveal } from "@/components/ui/Reveal";
import heroPhoto from "@/assets/brand/hero-bottle-box.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden paper-texture">
      {/* warm light */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full halo opacity-80 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-[380px] w-[380px] rounded-full bg-seaglass/25 blur-3xl" aria-hidden />

      <div className="container-page relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 lg:py-24">
        <div className="max-w-xl animate-fade-up">
          <p className="eyebrow">Personalised digital gifts · Keepsake bottles</p>
          <h1 className="mt-4 text-[2.7rem] leading-[1.0] sm:text-6xl lg:text-[4.6rem]">
            A feeling, <span className="italic font-light text-ocean">in a bottle.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-text-muted sm:text-xl">
            Write a message to someone you love. We turn it into a personalised, illustrated story with music they can open anywhere — and, if you like, a real glass bottle, glowing with your words inside.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href="/create" size="lg" variant="gold" className="shadow-warm">
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

        <div className="relative mx-auto w-full max-w-[640px] animate-fade-in lg:max-w-none" style={{ animationDelay: "120ms" }}>
          {/* photo panel */}
          <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] shadow-photo ring-1 ring-black/10 sm:aspect-[16/9] lg:aspect-[5/4]">
            <Image src={heroPhoto} alt="A small glass bottle with fairy lights and a rolled message, beside a kraft gift box on a beach at golden hour" priority placeholder="blur" sizes="(min-width: 1024px) 640px, 100vw" className="h-full w-full object-cover object-[30%_50%]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-cream/60 to-transparent" aria-hidden />
            {/* handwritten note */}
            <div className="absolute left-3 top-3 max-w-[58%] rotate-[-4deg] rounded-md bg-[#f5e9d2] px-3 py-2 shadow-card ring-1 ring-black/5 sm:left-6 sm:top-6 sm:max-w-none sm:px-4 sm:py-2.5 animate-sway motion-reduce:animate-none" style={{ animationDuration: "11s" }}>
              <p className="font-hand text-lg leading-tight text-[#5b4717] sm:text-2xl">Someone is thinking of you…</p>
            </div>
          </div>

          {/* the recipient's phone: overlaps the photo's lower-right corner */}
          <div className="-mt-[22%] ml-auto mr-3 w-fit sm:-mt-[30%] sm:mr-6 lg:absolute lg:-bottom-6 lg:-right-3 lg:mt-0 lg:mr-0">
            <PhoneMockup className="w-[140px] animate-float motion-reduce:animate-none sm:w-[190px] lg:w-[210px]">
              <div className="relative h-full w-full">
                <SceneArt spec={{ theme: "cinematic", motif: "lantern", timeOfDay: "dusk", seed: 4821 }} alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
                <div className="absolute inset-x-0 top-[12%] px-4 text-center text-text-on-dark">
                  <p className="text-[0.5rem] font-semibold uppercase tracking-[0.2em] text-text-on-dark-muted">For Eleanor</p>
                  <p className="mt-1.5 font-display text-[1.05rem] leading-tight sm:text-[1.25rem]">Someone has a message for you.</p>
                </div>
                <div className="absolute inset-x-0 bottom-[7%] px-4 text-center">
                  <span className="inline-flex h-8 items-center rounded-full bg-paper px-4 text-[0.65rem] font-semibold text-ink shadow-soft sm:h-9 sm:text-xs">Open the bottle</span>
                  <p className="mt-2 text-[0.55rem] text-text-on-dark-muted">A story in 6 scenes · gentle piano</p>
                </div>
              </div>
            </PhoneMockup>
          </div>
        </div>
      </div>

      <Reveal className="container-page relative pb-10 pt-12 lg:pt-14">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-7 border-t border-line pt-8 sm:grid-cols-3 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-pale text-[#6d5620]">{f.icon}</span>
              <span>
                <span className="block font-semibold text-ink">{f.title}</span>
                <span className="mt-0.5 block text-sm leading-snug text-text-muted">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

const FEATURES = [
  { title: "A physical keepsake", body: "A real glass bottle with your message rolled inside.", icon: <BottleIcon /> },
  { title: "A personalised story", body: "Illustrated and made just for them.", icon: <BookIcon /> },
  { title: "A soundtrack to match", body: "Music chosen for the mood of your words.", icon: <NoteIcon /> },
  { title: "A heartfelt message", body: "Your words, kept exactly as you wrote them.", icon: <HeartIcon /> },
  { title: "Delivered to their door", body: "Or sent in seconds by private link.", icon: <ParcelIcon /> },
];

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />;
}
const ico = "h-4.5 w-4.5";
function BottleIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 3h6v3l2 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-3z" />
      <path d="M10 14c1-1 3-1 4 0" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5a2 2 0 0 1 2-2h6v16H6a2 2 0 0 0-2 2z" />
      <path d="M20 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}
function ParcelIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8l9-4 9 4-9 4z" />
      <path d="M3 8v8l9 4 9-4V8M12 12v8" />
    </svg>
  );
}
