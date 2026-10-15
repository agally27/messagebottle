import { useEffect, useRef, useState } from "react";
import { OptionCard } from "@/components/ui/OptionCard";
import { Notice } from "@/components/ui/Notice";
import { moodsForOccasion } from "@/lib/domain/music";
import type { MusicMoodId } from "@/lib/domain/types";
import { ProceduralMusic } from "@/lib/audio/procedural-music";
import type { StepProps } from "../CreateWizard";
import { StepHeader } from "./StepHeader";

export function SoundStep({ input, update }: StepProps) {
  const engineRef = useRef<ProceduralMusic | null>(null);
  const [previewing, setPreviewing] = useState<MusicMoodId | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  const toggle = async (mood: MusicMoodId) => {
    if (mood === "none") return;
    if (previewing === mood) {
      engineRef.current?.stop();
      setPreviewing(null);
      return;
    }
    engineRef.current ??= new ProceduralMusic();
    const ok = await engineRef.current.play(mood);
    setPreviewing(ok ? mood : null);
  };

  // Carols first at Christmas.
  const moods = [...moodsForOccasion(input.occasion)].sort((a, b) => Number(Boolean(b.carol)) - Number(Boolean(a.carol)));
  const carolChosen = moods.find((m) => m.id === input.music)?.carol;

  return (
    <div>
      <StepHeader eyebrow="Step 6" title="Choose the sound" intro="Music plays softly behind the story once the recipient taps to begin. They can pause or mute at any time." />
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Music">
        {moods.map((m) => (
          <div key={m.id} className="relative">
            <OptionCard name="music" value={m.id} checked={input.music === m.id} onChange={(v) => update({ music: v as MusicMoodId })} title={m.label} description={m.description} compact className="h-full pr-24" />
            {m.procedural || m.carol ? (
              <button
                type="button"
                onClick={() => void toggle(m.id)}
                aria-pressed={previewing === m.id}
                aria-label={previewing === m.id ? `Stop ${m.label} preview` : `Preview ${m.label}`}
                className="absolute right-3 top-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 text-xs font-semibold text-ink hover:border-ink/50"
              >
                {previewing === m.id ? <StopIcon /> : <PlayIcon />}
                {previewing === m.id ? "Stop" : "Listen"}
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {carolChosen ? (
        <Notice tone="info" className="mt-5" title="A carol, with words for them">
          The traditional tune is played softly on bells or piano, and we write new words for it with {input.recipientName || "their"} name{input.recipientName ? "" : "s"} and yours. They appear in the story so the family can sing along. No recording is used, so nothing is sung aloud.
        </Notice>
      ) : (
        <Notice tone="demo" className="mt-5">
          Soundtracks are currently demonstration pieces generated on the device from the mood you choose. No copyrighted music is used. A generated-music service can be connected later without changing your gift.
        </Notice>
      )}

      <fieldset className="mt-8">
        <legend className="text-sm font-semibold text-ink">Narration</legend>
        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-paper p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ocean/50">
          <input type="checkbox" checked={input.narration} onChange={(e) => update({ narration: e.target.checked })} className="mt-1 h-5 w-5 accent-ink" />
          <span>
            <span className="font-semibold text-ink">Offer spoken narration</span>
            <span className="mt-1 block text-sm text-text-muted">The recipient can have the story read aloud. Where a narration service isn&apos;t configured, their device&apos;s own voice is used. The text is always shown, so sound is never required.</span>
          </span>
        </label>
      </fieldset>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
