import { Field, Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PhotoTiles } from "@/components/memories/PhotoTiles";
import { LIMITS } from "@/lib/domain/schemas";
import { parseSongLink } from "@/lib/domain/song";
import type { StepProps } from "../CreateWizard";
import { StepHeader } from "./StepHeader";

export interface PendingPhoto {
  key: string;
  file: File;
  src: string;
  caption: string;
  year: number | null;
}

export function MemoriesStep({ input, update, errors, photos, setPhotos }: StepProps & { photos: PendingPhoto[]; setPhotos: (fn: (p: PendingPhoto[]) => PendingPhoto[]) => void }) {
  const remembrance = input.occasion === "remembrance";
  const song = parseSongLink(input.songUrl);

  return (
    <div>
      <StepHeader
        eyebrow="Step 4 · optional"
        title={remembrance ? "Photos and a song to remember them by" : "Add photos and your song"}
        intro={remembrance ? "Pictures, the music they loved, and their name, so the story holds them close. Skip anything you'd rather not add." : "A few photos, the song that was yours, a year on each picture for a then-and-now timeline. All optional."}
      />

      {remembrance ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-[1fr_12rem]">
          <Field id="rememberedName" label="In loving memory of" optional hint="Shown gently at the start and end. We never write as if they are speaking.">
            <Input id="rememberedName" value={input.rememberedName} onChange={(e) => update({ rememberedName: e.target.value })} placeholder="Arthur Patel" maxLength={LIMITS.rememberedName} />
          </Field>
          <Field id="rememberedDates" label="Their years" optional>
            <Input id="rememberedDates" value={input.rememberedDates} onChange={(e) => update({ rememberedDates: e.target.value })} placeholder="1948 – 2025" maxLength={LIMITS.rememberedDates} />
          </Field>
        </div>
      ) : null}

      <section className="mt-8" aria-labelledby="photos-heading">
        <h2 id="photos-heading" className="text-lg font-semibold text-ink font-sans">Photos</h2>
        <p className="mt-1 text-sm text-text-muted">Up to {LIMITS.maxPhotos}. Add a year to any photo and they&apos;ll appear as a timeline. Photos are kept private and only shown through your gift link.</p>
        <div className="mt-4">
          <PhotoTiles
            tiles={photos.map((p) => ({ key: p.key, src: p.src, caption: p.caption, year: p.year }))}
            onAdd={(files) => setPhotos((prev) => [...prev, ...files.map((file) => ({ key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`, file, src: URL.createObjectURL(file), caption: "", year: null }))].slice(0, LIMITS.maxPhotos))}
            onChange={(key, patch) => setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))}
            onRemove={(key) => setPhotos((prev) => { const gone = prev.find((p) => p.key === key); if (gone) URL.revokeObjectURL(gone.src); return prev.filter((p) => p.key !== key); })}
            onMove={(key, dir) => setPhotos((prev) => { const i = prev.findIndex((p) => p.key === key); const j = i + dir; if (i < 0 || j < 0 || j >= prev.length) return prev; const next = [...prev]; [next[i], next[j]] = [next[j]!, next[i]!]; return next; })}
          />
        </div>
        {photos.length ? <p className="mt-3 text-xs text-text-muted">Photos upload when you create the gift. If you leave this page before then, you&apos;ll need to add them again.</p> : null}
      </section>

      <section className="mt-10" aria-labelledby="song-heading">
        <h2 id="song-heading" className="text-lg font-semibold text-ink font-sans">{remembrance ? "A song they loved" : "Your song"}</h2>
        <div className="mt-3 max-w-xl">
          <Field id="songUrl" label="Link to the song" optional hint="Paste a link from Spotify, Apple Music, YouTube, SoundCloud, Deezer or TIDAL. They'll be able to play it in the gift." error={errors.songUrl}>
            <Input id="songUrl" type="url" inputMode="url" value={input.songUrl} onChange={(e) => update({ songUrl: e.target.value })} placeholder="https://open.spotify.com/track/…" invalid={Boolean(errors.songUrl)} />
          </Field>
          {song ? <Notice tone="success" className="mt-3">{song.providerName} link added. It plays through {song.providerName}&apos;s own player, so they may need the app or an account for the full track.</Notice> : null}
        </div>
      </section>
    </div>
  );
}
