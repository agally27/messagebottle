import { useRef } from "react";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Chip, OptionCard } from "@/components/ui/OptionCard";
import { getOccasion } from "@/lib/domain/occasions";
import { LIMITS } from "@/lib/domain/schemas";
import { TONES } from "@/lib/domain/tones";
import type { ToneId, Transformation } from "@/lib/domain/types";
import type { StepProps } from "../CreateWizard";
import { StepHeader } from "./StepHeader";

const TRANSFORMATIONS: Array<{ id: Transformation; title: string; description: string }> = [
  { id: "close", title: "Keep my words as they are", description: "Your message, presented scene by scene. Nothing added but the title and a dedication." },
  { id: "story", title: "Shape it into a story", description: "Your sentences stay intact; we add gentle framing, headings and an opening and closing." },
  { id: "poetic", title: "Make it more poetic", description: "Your words set as verse with a softer rhythm. Still yours, line for line." },
];

export function MessageStep({ input, update, errors }: StepProps) {
  const occasion = getOccasion(input.occasion);
  const ref = useRef<HTMLTextAreaElement>(null);
  const name = input.recipientName || "them";

  const insertPrompt = (prompt: string) => {
    const el = ref.current;
    const current = input.message;
    const separator = current.trim().length ? (current.endsWith("\n") ? "\n" : "\n\n") : "";
    const next = `${current}${separator}${prompt} `;
    update({ message: next.slice(0, LIMITS.messageMax) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.length, next.length);
    });
  };

  const tones = input.occasion === "remembrance" ? TONES.filter((t) => t.id !== "celebratory" && t.id !== "playful") : TONES;

  return (
    <div>
      <StepHeader eyebrow="Step 3" title={`What do you want ${name} to know?`} intro="Write it the way you'd say it. A few honest sentences are better than many polished ones. Your words stay yours." />
      <div className="mt-8 space-y-8">
        <Field id="message" label="Your message" error={errors.message} counter={`${input.message.length} / ${LIMITS.messageMax}`} hint="At least a sentence or two. You can edit everything later.">
          <Textarea ref={ref} id="message" value={input.message} onChange={(e) => update({ message: e.target.value })} placeholder={`Dear ${name}…`} maxLength={LIMITS.messageMax} className="min-h-[14rem] text-[1.05rem]" invalid={Boolean(errors.message)} />
          <div className="mt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-faint">Stuck? Start with one of these</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {occasion.prompts.map((p) => (
                <Chip key={p} onClick={() => insertPrompt(p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </div>
        </Field>

        <Field id="memories" label="A memory or detail you'd like included" optional hint="One or two specifics make it unmistakably about them. We'll use exactly what you write." counter={`${input.memories.length} / ${LIMITS.memories}`}>
          <Textarea id="memories" value={input.memories} onChange={(e) => update({ memories: e.target.value })} placeholder="That rainy afternoon in Whitby when we shared chips under the pier." maxLength={LIMITS.memories} className="min-h-[6rem]" />
        </Field>

        <Field id="datesAndPlaces" label="A meaningful date or place" optional hint="Shown in the dedication. e.g. “Whitby, 14 June 2016”.">
          <Input id="datesAndPlaces" value={input.datesAndPlaces} onChange={(e) => update({ datesAndPlaces: e.target.value })} placeholder="Whitby, 14 June 2016" maxLength={LIMITS.datesAndPlaces} />
        </Field>

        <fieldset>
          <legend className="text-sm font-semibold text-ink">Tone</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Tone">
            {tones.map((t) => (
              <Chip key={t.id} selected={input.tone === t.id} onClick={() => update({ tone: t.id as ToneId })}>
                {t.label}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-sm text-text-muted">{TONES.find((t) => t.id === input.tone)?.description}</p>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-ink">How much should we shape it?</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Transformation">
            {TRANSFORMATIONS.map((t) => (
              <OptionCard key={t.id} name="transformation" value={t.id} checked={input.transformation === t.id} onChange={(v) => update({ transformation: v as Transformation })} title={t.title} description={t.description} compact />
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
