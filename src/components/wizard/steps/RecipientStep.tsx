import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { LIMITS } from "@/lib/domain/schemas";
import type { AgeRange, Pronouns } from "@/lib/domain/types";
import type { StepProps } from "../CreateWizard";
import { StepHeader } from "./StepHeader";

const RELATIONSHIPS = ["my family", "my parents", "my grandparents", "my wife", "my husband", "my partner", "my girlfriend", "my boyfriend", "my mum", "my dad", "my daughter", "my son", "my sister", "my brother", "my best friend", "my friend", "my grandma", "my grandad", "my colleague"];

export function RecipientStep({ input, update, errors }: StepProps) {
  return (
    <div>
      <StepHeader eyebrow="Step 2" title="Who is this for?" intro="Just enough to make it personal. Nothing here is shown to anyone but you and them." />
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Field id="recipientName" label="Their first name, or what you call them" error={errors.recipientName}>
          <Input id="recipientName" value={input.recipientName} onChange={(e) => update({ recipientName: e.target.value })} placeholder={input.occasion === "christmas" ? "Grandma and Grandad, or the Patel family" : "Eleanor"} maxLength={LIMITS.recipientName} autoComplete="off" invalid={Boolean(errors.recipientName)} />
        </Field>
        <Field id="relationship" label="Who they are to you" error={errors.relationship}>
          <Input id="relationship" list="relationship-options" value={input.relationship} onChange={(e) => update({ relationship: e.target.value })} placeholder="my wife, my best friend, my dad…" maxLength={LIMITS.relationship} autoComplete="off" invalid={Boolean(errors.relationship)} />
          <datalist id="relationship-options">
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <Field id="pronouns" label="Their pronouns" optional hint="Only used if we need to refer to them in the third person.">
          <Select id="pronouns" value={input.pronouns} onChange={(e) => update({ pronouns: e.target.value as Pronouns })}>
            <option value="unspecified">Prefer not to say</option>
            <option value="she">She / her</option>
            <option value="he">He / him</option>
            <option value="they">They / them</option>
          </Select>
        </Field>
        <Field id="ageRange" label="Roughly how old are they?" optional hint="Helps us pitch the language right.">
          <Select id="ageRange" value={input.ageRange} onChange={(e) => update({ ageRange: e.target.value as AgeRange })}>
            <option value="unspecified">Prefer not to say</option>
            <option value="child">A child</option>
            <option value="teen">A teenager</option>
            <option value="adult">An adult</option>
            <option value="older">An older adult</option>
          </Select>
        </Field>
        <Field id="senderName" label="Your name, as you'd sign it" error={errors.senderName}>
          <Input id="senderName" value={input.senderName} onChange={(e) => update({ senderName: e.target.value })} placeholder={input.occasion === "christmas" ? "Tom, or all of us at number 12" : "Tom"} maxLength={LIMITS.senderName} autoComplete="given-name" invalid={Boolean(errors.senderName)} />
        </Field>
        <Field id="recipientContext" label="Anything else that helps?" optional hint="A sentence about them or the situation. Optional." className="sm:col-span-2" counter={`${input.recipientContext.length} / ${LIMITS.recipientContext}`}>
          <Textarea id="recipientContext" value={input.recipientContext} onChange={(e) => update({ recipientContext: e.target.value })} placeholder="She's just moved to Edinburgh for a new job and is finding it hard." maxLength={LIMITS.recipientContext} className="min-h-[5.5rem]" />
        </Field>
      </div>
    </div>
  );
}
