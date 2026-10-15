import { Field, Input } from "@/components/ui/Field";
import { OptionCard } from "@/components/ui/OptionCard";
import { OCCASIONS } from "@/lib/domain/occasions";
import type { OccasionId } from "@/lib/domain/types";
import type { StepProps } from "../CreateWizard";
import { StepHeader } from "./StepHeader";

export function OccasionStep({ input, update, errors }: StepProps) {
  return (
    <div>
      <StepHeader eyebrow="Step 1" title="What's the occasion?" intro="This shapes the tone, the imagery and the words we offer when you need them." />
      <div role="radiogroup" aria-label="Occasion" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {OCCASIONS.map((o) => (
          <OptionCard key={o.id} name="occasion" value={o.id} checked={input.occasion === o.id} onChange={(v) => update({ occasion: v as OccasionId })} title={o.label} description={o.description} compact />
        ))}
      </div>
      {input.occasion === "other" ? (
        <div className="mt-6 max-w-md">
          <Field id="customOccasion" label="Tell us the occasion" error={errors.customOccasion}>
            <Input id="customOccasion" value={input.customOccasion} onChange={(e) => update({ customOccasion: e.target.value })} placeholder="e.g. Passing your driving test" maxLength={60} invalid={Boolean(errors.customOccasion)} autoFocus />
          </Field>
        </div>
      ) : null}
      {input.occasion === "remembrance" ? (
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-text-muted">
          We&apos;ll keep the language gentle and honest. Nothing will be written as if it comes from someone who has died, and no voice is ever imitated.
        </p>
      ) : null}
    </div>
  );
}
