import { Reveal } from "@/components/ui/Reveal";
import { physicalProductsEnabled } from "@/lib/config/catalogue";

const STEPS = [
  { n: "01", title: "Write what you feel", body: "A few honest sentences are enough. Add a memory, a date, a place. If the words won't come, gentle prompts help." },
  { n: "02", title: "Choose the look and sound", body: "Pick an occasion, a visual style and a soundtrack. We shape your message into a short illustrated story — and you approve every line." },
  { n: "03", title: "Send a link, or send the bottle", body: "They open it on any phone, no app needed. Or add a glass keepsake bottle with your message printed inside and a QR code to the story." },
] as const;

const DIGITAL_SEND = { n: "03", title: "Send the link", body: "Share it by message or email, or print the QR code on a card. They open it on any phone, no app or account needed." } as const;

export function HowItWorks() {
  const steps = physicalProductsEnabled() ? STEPS : [STEPS[0], STEPS[1], DIGITAL_SEND];
  return (
    <section id="how-it-works" className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Three steps from a thought to a gift.</h2>
        </Reveal>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 110} className="relative rounded-2xl border border-line bg-paper p-6 shadow-soft">
              <span className="font-display text-4xl text-gold-deep">{s.n}</span>
              <h3 className="mt-3 text-xl">{s.title}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-text-muted">{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
