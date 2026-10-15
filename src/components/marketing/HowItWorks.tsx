const STEPS = [
  {
    n: "01",
    title: "Write what you feel",
    body: "A few honest sentences are enough. Add a memory, a date, a place. If the words won't come, gentle prompts help.",
  },
  {
    n: "02",
    title: "Choose the look and sound",
    body: "Pick an occasion, a visual style and a soundtrack. We shape your message into a short illustrated story — and you approve every line.",
  },
  {
    n: "03",
    title: "Send a private link, or a real bottle",
    body: "They open it on any phone, no app needed. Add a glass keepsake bottle with your message printed inside and a QR code to the story.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Three steps from a thought to a gift.</h2>
        </div>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-line bg-paper p-6 shadow-soft">
              <span className="font-display text-3xl text-gold-deep">{s.n}</span>
              <h3 className="mt-3 text-xl">{s.title}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
