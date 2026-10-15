"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { saveGiftSettingsAction } from "@/lib/actions/gifts";
import { MUSIC_MOODS } from "@/lib/domain/music";
import { THEMES } from "@/lib/domain/themes";
import type { GiftInput, MusicMoodId, ThemeId } from "@/lib/domain/types";

export function GiftSettings({ giftId, input }: { giftId: string; input: GiftInput }) {
  const router = useRouter();
  const [form, setForm] = useState({ recipientName: input.recipientName, senderName: input.senderName, theme: input.theme, music: input.music, narration: input.narration });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const dirty = form.recipientName !== input.recipientName || form.senderName !== input.senderName || form.theme !== input.theme || form.music !== input.music || form.narration !== input.narration;

  const save = () =>
    startTransition(async () => {
      const r = await saveGiftSettingsAction(giftId, form);
      if (r.ok) {
        setMessage({ tone: "success", text: "Saved." });
        router.refresh();
      } else setMessage({ tone: "danger", text: r.error });
    });

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="s-recipientName" label="Recipient's name">
        <Input id="s-recipientName" value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} maxLength={40} />
      </Field>
      <Field id="s-senderName" label="Your name">
        <Input id="s-senderName" value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} maxLength={40} />
      </Field>
      <Field id="s-theme" label="Visual style" hint="Changes the look instantly; the words stay the same.">
        <Select id="s-theme" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value as ThemeId })}>
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="s-music" label="Music">
        <Select id="s-music" value={form.music} onChange={(e) => setForm({ ...form, music: e.target.value as MusicMoodId })}>
          {MUSIC_MOODS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-3 sm:col-span-2">
        <input type="checkbox" checked={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.checked })} className="h-5 w-5 accent-ink" />
        <span className="text-sm text-ink">Offer spoken narration to the recipient</span>
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button onClick={save} disabled={!dirty || pending} variant="secondary">
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {message ? <Notice tone={message.tone} className="py-1.5">{message.text}</Notice> : null}
      </div>
    </div>
  );
}
