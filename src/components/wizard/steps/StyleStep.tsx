import { SceneArt } from "@/components/art/SceneArt";
import { OptionCard } from "@/components/ui/OptionCard";
import { getOccasion } from "@/lib/domain/occasions";
import { THEMES } from "@/lib/domain/themes";
import type { ThemeId } from "@/lib/domain/types";
import type { StepProps } from "../CreateWizard";
import { StepHeader } from "./StepHeader";

export function StyleStep({ input, update }: StepProps) {
  const suggested = getOccasion(input.occasion).suggestedThemes;
  const ordered = [...THEMES].sort((a, b) => (suggested.includes(a.id) ? 0 : 1) - (suggested.includes(b.id) ? 0 : 1));
  return (
    <div>
      <StepHeader eyebrow="Step 5" title="Choose the look" intro="The style sets the colours, the illustrations, the type and the way scenes move. Suggested styles for this occasion come first." />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Visual style">
        {ordered.map((t, i) => (
          <OptionCard
            key={t.id}
            name="theme"
            value={t.id}
            checked={input.theme === t.id}
            onChange={(v) => update({ theme: v as ThemeId })}
            title={t.name}
            description={<span className="hidden sm:inline">{t.description}</span>}
            compact
            media={
              <div className="aspect-[4/3]">
                <SceneArt spec={{ theme: t.id, motif: (["lantern", "shore", "letter", "window", "boat", "tree"] as const)[i % 6]!, timeOfDay: t.mode === "dark" ? "night" : "day", seed: 300 + i }} alt={`${t.name} preview`} />
                {suggested.includes(t.id) ? <span className="absolute left-2 top-2 rounded-full bg-paper/90 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-teal">Suggested</span> : null}
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}
