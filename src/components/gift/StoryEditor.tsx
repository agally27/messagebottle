"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { saveStoryEditsAction } from "@/lib/actions/gifts";
import type { Story } from "@/lib/domain/types";

/** Edit every line of the generated story, and reorder scenes. Saves without regenerating. */
export function StoryEditor({ giftId, story }: { giftId: string; story: Story }) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => ({
    title: story.title,
    opening: story.opening,
    closing: story.closing,
    dedication: story.dedication,
    scenes: [...story.scenes].sort((a, b) => a.order - b.order).map((s) => ({ id: s.id, heading: s.heading, text: s.text })),
  }));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
    setMessage(null);
  };

  const setScene = (id: string, patch: Partial<{ heading: string; text: string }>) => {
    set(
      "scenes",
      draft.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...draft.scenes];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    set("scenes", next);
  };

  const save = () => {
    startTransition(async () => {
      const r = await saveStoryEditsAction(giftId, {
        title: draft.title,
        opening: draft.opening,
        closing: draft.closing,
        dedication: draft.dedication,
        scenes: draft.scenes.map((s) => ({ id: s.id, heading: s.heading, text: s.text })),
        sceneOrder: draft.scenes.map((s) => s.id),
      });
      if (r.ok) {
        setMessage({ tone: "success", text: "Saved. The preview and the recipient's link now show your changes." });
        setDirty(false);
        router.refresh();
      } else {
        setMessage({ tone: "danger", text: r.fieldErrors ? Object.values(r.fieldErrors).join(" ") : r.error });
      }
    });
  };

  return (
    <div className="space-y-8">
      <Field id="title" label="Title">
        <Input id="title" value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={120} />
      </Field>
      <Field id="opening" label="Opening message" hint="The first thing they read after opening the bottle.">
        <Textarea id="opening" value={draft.opening} onChange={(e) => set("opening", e.target.value)} maxLength={1500} className="min-h-[7rem]" />
      </Field>

      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-ink">Scenes</legend>
        {draft.scenes.map((s, i) => (
          <div key={s.id} className="rounded-xl border border-line bg-paper p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-faint">Scene {i + 1}</p>
              <div className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move scene ${i + 1} up`} className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink hover:bg-ink/5 disabled:opacity-30">
                  ↑
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === draft.scenes.length - 1} aria-label={`Move scene ${i + 1} down`} className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink hover:bg-ink/5 disabled:opacity-30">
                  ↓
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3">
              <Field id={`${s.id}-heading`} label="Heading" optional>
                <Input id={`${s.id}-heading`} value={s.heading} onChange={(e) => setScene(s.id, { heading: e.target.value })} maxLength={120} />
              </Field>
              <Field id={`${s.id}-text`} label="Text">
                <Textarea id={`${s.id}-text`} value={s.text} onChange={(e) => setScene(s.id, { text: e.target.value })} maxLength={1500} className="min-h-[8rem]" />
              </Field>
            </div>
          </div>
        ))}
      </fieldset>

      <Field id="closing" label="Closing words" hint="Include your sign-off here.">
        <Textarea id="closing" value={draft.closing} onChange={(e) => set("closing", e.target.value)} maxLength={1500} className="min-h-[7rem]" />
      </Field>
      <Field id="dedication" label="Dedication" optional hint="Shown on the final keepsake screen.">
        <Input id="dedication" value={draft.dedication} onChange={(e) => set("dedication", e.target.value)} maxLength={300} />
      </Field>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {dirty ? <span className="text-sm text-text-muted">Unsaved changes</span> : null}
      </div>
    </div>
  );
}
