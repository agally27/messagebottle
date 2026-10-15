"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { LIMITS } from "@/lib/domain/schemas";

export interface PhotoTile {
  key: string;
  src: string;
  caption: string;
  year: number | null;
  busy?: boolean;
}

/**
 * Grid of photo tiles with caption + year fields, add button, remove and
 * reorder. Purely presentational: the parent decides whether changes upload
 * immediately (gift editor) or wait for gift creation (wizard).
 */
export function PhotoTiles({ tiles, onAdd, onChange, onRemove, onMove, disabled }: {
  tiles: PhotoTile[];
  onAdd: (files: File[]) => void;
  onChange: (key: string, patch: { caption?: string; year?: number | null }) => void;
  onRemove: (key: string) => void;
  onMove: (key: string, dir: -1 | 1) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const remaining = LIMITS.maxPhotos - tiles.length;
  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t, i) => (
          <li key={t.key} className={cn("rounded-xl bg-paper p-2 pb-3 shadow-soft ring-1 ring-black/5", t.busy && "opacity-60")}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-sand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.src} alt={t.caption || `Photo ${i + 1}`} className="h-full w-full object-cover" />
              <div className="absolute right-1.5 top-1.5 flex gap-1">
                <button type="button" onClick={() => onMove(t.key, -1)} disabled={i === 0 || disabled} aria-label={`Move photo ${i + 1} earlier`} className="flex h-8 w-8 items-center justify-center rounded-full bg-paper/90 text-sm text-ink shadow-soft disabled:opacity-30">←</button>
                <button type="button" onClick={() => onMove(t.key, 1)} disabled={i === tiles.length - 1 || disabled} aria-label={`Move photo ${i + 1} later`} className="flex h-8 w-8 items-center justify-center rounded-full bg-paper/90 text-sm text-ink shadow-soft disabled:opacity-30">→</button>
                <button type="button" onClick={() => onRemove(t.key)} disabled={disabled} aria-label={`Remove photo ${i + 1}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-paper/90 text-sm text-danger shadow-soft">✕</button>
              </div>
            </div>
            <label className="sr-only" htmlFor={`cap-${t.key}`}>Caption for photo {i + 1}</label>
            <input id={`cap-${t.key}`} value={t.caption} onChange={(e) => onChange(t.key, { caption: e.target.value })} maxLength={LIMITS.photoCaption} placeholder="Caption (optional)" disabled={disabled} className="mt-2 w-full rounded-md border border-line-strong bg-white/70 px-2.5 py-1.5 font-hand text-lg text-ink placeholder:font-sans placeholder:text-sm placeholder:text-text-faint" />
            <label className="sr-only" htmlFor={`year-${t.key}`}>Year for photo {i + 1}</label>
            <input id={`year-${t.key}`} inputMode="numeric" value={t.year ?? ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); onChange(t.key, { year: v.length === 4 ? Number(v) : null }); }} placeholder="Year" disabled={disabled} className="mt-1.5 w-24 rounded-md border border-line-strong bg-white/70 px-2.5 py-1 text-sm text-ink placeholder:text-text-faint" />
          </li>
        ))}
        {remaining > 0 ? (
          <li>
            <button type="button" onClick={() => input.current?.click()} disabled={disabled} className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-paper/60 text-ink hover:border-ink/40 disabled:opacity-50">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-ocean" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="5" width="18" height="15" rx="2" />
                <circle cx="9" cy="11" r="2" />
                <path d="m21 17-5-5-9 9M12 2v6M9 5h6" />
              </svg>
              <span className="text-sm font-semibold">Add photos</span>
              <span className="text-xs text-text-muted">{remaining} more</span>
            </button>
          </li>
        ) : null}
      </ul>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Choose photos"
        data-testid="photo-input"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).slice(0, remaining);
          if (files.length) onAdd(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
