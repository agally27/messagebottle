import { physicalProductsEnabled } from "@/lib/config/catalogue";

const FAQS = [
  {
    q: "What does the recipient actually get?",
    a: "A private link. When they open it, a short cinematic sequence reveals your message, then an illustrated story in a handful of scenes with a soundtrack and, optionally, narration. It ends with your closing words and a keepsake screen they can return to. No app, no account.",
  },
  {
    q: "Is the story really written by AI? Will it put words in my mouth?",
    a: "Your message is the foundation and stays intact. We use it, and the details you add, to shape a short story in the tone you choose. Nothing invented is added as fact, and you read and edit every line before anything is sent. You can also keep the story very close to your original words.",
  },
  {
    q: "Can I see it before I pay?",
    a: "Yes. You create and preview the complete gift first. Payment only unlocks sending the private link (and, if you choose, the physical bottle).",
    physical: true,
  },
  {
    q: "Can I see it before I pay?",
    a: "Yes. You create and preview the complete gift first. Payment only unlocks sending the private link.",
    physical: false,
  },
  {
    q: "What's inside the physical bottle?",
    a: "A glass keepsake bottle with your message printed on quality paper, rolled and tied, a ribbon seal and a small card with a QR code that opens the digital story. It arrives in protective gift packaging.",
    physical: true,
  },
  {
    q: "Can I send a real bottle?",
    a: "Not yet. Keepsake bottles with your message rolled inside are coming soon. For now you can print the gift's QR code on a card of your own.",
    physical: false,
  },
  {
    q: "How private is this?",
    a: "Very. Links are long, random and unguessable; nobody can browse to someone else's gift. You can revoke a link at any time. We only use your message to create your gift, never to train models, and you can delete a gift and its content whenever you like.",
  },
  {
    q: "Can I make a remembrance gift?",
    a: "Yes, and we treat these with particular care. The language stays gentle and honest. We never pretend to speak as someone who has died, and we never imitate anyone's voice.",
  },
  {
    q: "What music is used?",
    a: "You choose a mood, and a soundtrack plays in the browser to match it; for Christmas, a traditional carol. You can also link a song from Spotify, Apple Music or YouTube, which plays through that service's own player when they tap play.",
  },
] as const;

export function FAQ() {
  const physical = physicalProductsEnabled();
  const faqs = FAQS.filter((f) => !("physical" in f) || f.physical === physical);
  return (
    <section id="faq" className="scroll-mt-20 border-t border-line bg-paper py-16 sm:py-24">
      <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">Questions</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Good to know before you begin.</h2>
          <p className="mt-4 text-text-muted">Anything else? <a href="/support" className="font-semibold text-ocean underline-offset-4 hover:underline">Get in touch</a>.</p>
        </div>
        <div className="divide-y divide-line rounded-xl border border-line bg-cream">
          {faqs.map((f) => (
            <details key={f.q} className="group px-5 py-4 open:bg-paper first:rounded-t-xl last:rounded-b-xl">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-1 text-[1.02rem] font-semibold text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                {f.q}
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-text-faint transition-transform group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className="pb-2 pt-2 text-[0.95rem] leading-relaxed text-text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
