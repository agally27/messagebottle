"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PhotoTiles, type PhotoTile } from "@/components/memories/PhotoTiles";
import { editPhotosAction, removePhotoAction, saveGiftSettingsAction } from "@/lib/actions/gifts";
import { LIMITS } from "@/lib/domain/schemas";
import { parseSongLink } from "@/lib/domain/song";
import { uploadPhoto } from "@/lib/media/resize";

interface Props {
  giftId: string;
  photos: Array<{ id: string; url: string; caption: string; year: number | null }>;
  songUrl: string;
  rememberedName: string;
  rememberedDates: string;
  remembrance: boolean;
}

type Msg = { tone: "success" | "danger" | "warning"; text: string } | null;

/**
 * Sender's editor for the memory parts of a gift: photos (upload immediately,
 * captions/years/order saved together), the song link and the remembrance line.
 * None of these need the story to be regenerated.
 */
export function MemoriesEditor({ giftId, photos, songUrl, rememberedName, rememberedDates, remembrance }: Props) {
  const router = useRouter();
  const [tiles, setTiles] = useState<PhotoTile[]>(() => photos.map((p) => ({ key: p.id, src: p.url, caption: p.caption, year: p.year })));
  const [uploading, setUploading] = useState<PhotoTile[]>([]);
  const [photoMsg, setPhotoMsg] = useState<Msg>(null);
  const [form, setForm] = useState({ songUrl, rememberedName, rememberedDates });
  const [formMsg, setFormMsg] = useState<Msg>(null);
  const [pending, startTransition] = useTransition();
  const blobUrls = useRef<string[]>([]);

  // Server is the source of truth once an upload or save lands.
  const serverKey = photos.map((p) => `${p.id}:${p.caption}:${p.year}`).join("|");
  const [lastKey, setLastKey] = useState(serverKey);
  if (serverKey !== lastKey) {
    setLastKey(serverKey);
    setTiles(photos.map((p) => ({ key: p.id, src: p.url, caption: p.caption, year: p.year })));
  }

  useEffect(() => () => blobUrls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const original = new Map(photos.map((p, i) => [p.id, { ...p, i }]));
  const photosDirty = tiles.some((t, i) => {
    const o = original.get(t.key);
    return !o || o.i !== i || o.caption !== t.caption || o.year !== t.year;
  });

  const add = async (files: File[]) => {
    setPhotoMsg(null);
    const pendingTiles = files.map((f, i) => {
      const src = URL.createObjectURL(f);
      blobUrls.current.push(src);
      return { key: `up-${Date.now()}-${i}`, src, caption: "", year: null, busy: true } satisfies PhotoTile;
    });
    setUploading((u) => [...u, ...pendingTiles]);
    let failed = 0;
    let lastError = "";
    for (const [i, file] of files.entries()) {
      const r = await uploadPhoto(giftId, file, { caption: "", year: null });
      if (!r.ok) {
        failed++;
        lastError = r.error;
      }
      setUploading((u) => u.filter((t) => t.key !== pendingTiles[i]!.key));
    }
    if (failed) setPhotoMsg({ tone: "danger", text: failed === files.length ? lastError : `${failed} of ${files.length} photos couldn't be added. ${lastError}` });
    else setPhotoMsg({ tone: "success", text: files.length === 1 ? "Photo added." : `${files.length} photos added.` });
    router.refresh();
  };

  const remove = (key: string) =>
    startTransition(async () => {
      const r = await removePhotoAction(giftId, key);
      if (r.ok) {
        setTiles((t) => t.filter((x) => x.key !== key));
        setPhotoMsg({ tone: "success", text: "Photo removed." });
        router.refresh();
      } else setPhotoMsg({ tone: "danger", text: r.error });
    });

  const move = (key: string, dir: -1 | 1) =>
    setTiles((t) => {
      const i = t.findIndex((x) => x.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= t.length) return t;
      const next = [...t];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  const savePhotos = () =>
    startTransition(async () => {
      const r = await editPhotosAction(giftId, { photos: tiles.map((t) => ({ id: t.key, caption: t.caption, year: t.year })), order: tiles.map((t) => t.key) });
      if (r.ok) {
        setPhotoMsg({ tone: "success", text: "Photos saved." });
        router.refresh();
      } else setPhotoMsg({ tone: "danger", text: r.error });
    });

  const song = parseSongLink(form.songUrl);
  const songInvalid = form.songUrl.trim() !== "" && !song;
  const formDirty = form.songUrl !== songUrl || form.rememberedName !== rememberedName || form.rememberedDates !== rememberedDates;

  const saveForm = () =>
    startTransition(async () => {
      const r = await saveGiftSettingsAction(giftId, form);
      if (r.ok) {
        setFormMsg({ tone: "success", text: "Saved." });
        router.refresh();
      } else setFormMsg({ tone: "danger", text: r.error });
    });

  const busy = pending || uploading.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg">Photos</h3>
        <p className="mt-1 text-sm text-text-muted">Up to {LIMITS.maxPhotos}. Add a year to show them as a timeline. Location data is removed from every photo.</p>
        <div className="mt-4">
          <PhotoTiles
            tiles={[...tiles, ...uploading]}
            onAdd={(files) => void add(files)}
            onChange={(key, patch) => setTiles((t) => t.map((x) => (x.key === key ? { ...x, ...patch } : x)))}
            onRemove={remove}
            onMove={move}
            disabled={busy}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={savePhotos} disabled={!photosDirty || busy} variant="secondary">
            {uploading.length ? `Adding ${uploading.length === 1 ? "photo" : "photos"}…` : pending ? "Saving…" : "Save captions and order"}
          </Button>
          {photoMsg ? (
            <Notice tone={photoMsg.tone} className="py-1.5">
              {photoMsg.text}
            </Notice>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field id="m-songUrl" label="Link to the song" hint="Spotify, Apple Music, YouTube, SoundCloud, Deezer or TIDAL." error={songInvalid ? "That link isn't from a music service we support." : undefined}>
            <Input id="m-songUrl" type="url" inputMode="url" value={form.songUrl} onChange={(e) => setForm({ ...form, songUrl: e.target.value })} maxLength={400} placeholder="https://open.spotify.com/track/…" />
          </Field>
          {song ? <p className="mt-1.5 text-xs text-text-muted">Plays through {song.providerName}{song.embedUrl ? "'s own player, only when they tap play" : " (opens in their app)"}.</p> : null}
        </div>
        <Field id="m-rememberedName" label="In loving memory of" hint={remembrance ? "Shown gently on the opening and the keepsake." : "Only if this gift remembers someone."}>
          <Input id="m-rememberedName" value={form.rememberedName} onChange={(e) => setForm({ ...form, rememberedName: e.target.value })} maxLength={LIMITS.rememberedName} />
        </Field>
        <Field id="m-rememberedDates" label="Their years" hint="For example 1941 – 2024.">
          <Input id="m-rememberedDates" value={form.rememberedDates} onChange={(e) => setForm({ ...form, rememberedDates: e.target.value })} maxLength={LIMITS.rememberedDates} />
        </Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button onClick={saveForm} disabled={!formDirty || songInvalid || pending} variant="secondary">
            {pending ? "Saving…" : "Save song and dedication"}
          </Button>
          {formMsg ? (
            <Notice tone={formMsg.tone} className="py-1.5">
              {formMsg.text}
            </Notice>
          ) : null}
        </div>
      </div>
    </div>
  );
}
