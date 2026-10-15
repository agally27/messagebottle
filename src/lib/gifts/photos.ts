import "server-only";
import sharp from "sharp";
import { getStore } from "@/lib/data";
import { getMediaStore } from "@/lib/media";
import { LIMITS, photoEditSchema } from "@/lib/domain/schemas";
import type { Gift, GiftPhoto } from "@/lib/domain/types";
import { AuthError } from "@/lib/auth/guards";
import { newId, nowIso } from "@/lib/utils/ids";

export class PhotoError extends Error {
  constructor(message: string, public readonly status: 400 | 413 | 415 | 409 | 429 = 400) {
    super(message);
  }
}

/** Upload body limit (Vercel functions accept ~4.5 MB; the browser shrinks photos first). */
export const MAX_UPLOAD_BYTES = 4_400_000;
const MAX_EDGE = 1600;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]);

/**
 * Re-encodes an uploaded image: auto-rotates, resizes to at most 1600px,
 * converts to JPEG and drops all metadata (EXIF, GPS location, camera serial).
 */
export async function processPhoto(input: Buffer, declaredType: string): Promise<{ data: Buffer; width: number; height: number }> {
  if (declaredType && !ACCEPTED.has(declaredType)) throw new PhotoError("Please add JPEG, PNG or WebP photos.", 415);
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new PhotoError("That photo is too large. Try a smaller one.", 413);
  try {
    const { data, info } = await sharp(input, { failOn: "error", limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw new PhotoError("We couldn't read that image. Please use a JPEG, PNG or WebP photo.", 415);
  }
}

export function photosOf(gift: Pick<Gift, "photos">): GiftPhoto[] {
  return [...(gift.photos ?? [])].sort((a, b) => a.order - b.order);
}

export async function addPhoto(gift: Gift, file: { data: Buffer; type: string }, meta: { caption?: string; year?: number | null } = {}): Promise<GiftPhoto> {
  const existing = photosOf(gift);
  if (existing.length >= LIMITS.maxPhotos) throw new PhotoError(`You can add up to ${LIMITS.maxPhotos} photos.`, 409);
  const limit = await getStore().rateLimit.hit(`photos:${gift.ownerId}`, 80, 60 * 60 * 1000);
  if (!limit.allowed) throw new PhotoError("Too many uploads in the last hour. Please try again later.", 429);
  const processed = await processPhoto(file.data, file.type);
  const id = newId();
  const storageKey = `gifts/${gift.id}/photos/${id}.jpg`;
  await getMediaStore().put(storageKey, processed.data, "image/jpeg");
  const photo: GiftPhoto = {
    id,
    storageKey,
    contentType: "image/jpeg",
    width: processed.width,
    height: processed.height,
    bytes: processed.data.byteLength,
    caption: (meta.caption ?? "").trim().slice(0, LIMITS.photoCaption),
    year: meta.year && meta.year >= 1850 && meta.year <= 2100 ? Math.floor(meta.year) : null,
    order: existing.length ? Math.max(...existing.map((p) => p.order)) + 1 : 0,
    createdAt: nowIso(),
  };
  // Re-read to avoid losing a concurrent upload's entry.
  const fresh = (await getStore().gifts.get(gift.id)) ?? gift;
  const photos = [...photosOf(fresh), photo];
  if (photos.length > LIMITS.maxPhotos) {
    await getMediaStore().delete([storageKey]);
    throw new PhotoError(`You can add up to ${LIMITS.maxPhotos} photos.`, 409);
  }
  await getStore().gifts.update(gift.id, { photos });
  return photo;
}

export async function removePhoto(gift: Gift, photoId: string): Promise<void> {
  const photo = photosOf(gift).find((p) => p.id === photoId);
  if (!photo) throw new AuthError(404, "Photo not found.");
  await getStore().gifts.update(gift.id, { photos: photosOf(gift).filter((p) => p.id !== photoId).map((p, i) => ({ ...p, order: i })) });
  await getMediaStore().delete([photo.storageKey]);
}

export async function editPhotos(gift: Gift, raw: unknown): Promise<GiftPhoto[]> {
  const edits = photoEditSchema.parse(raw);
  let photos = photosOf(gift).map((p) => ({ ...p }));
  for (const e of edits.photos) {
    const p = photos.find((x) => x.id === e.id);
    if (!p) throw new AuthError(404, "Photo not found.");
    p.caption = e.caption;
    p.year = e.year;
  }
  if (edits.order) {
    const ids = photos.map((p) => p.id);
    if (edits.order.length !== ids.length || [...edits.order].sort().join() !== [...ids].sort().join()) throw new AuthError(404, "Photo order is invalid.");
    photos = edits.order.map((id, i) => ({ ...photos.find((p) => p.id === id)!, order: i }));
  }
  await getStore().gifts.update(gift.id, { photos });
  return photos;
}

export async function readPhoto(gift: Gift, photoId: string) {
  const photo = photosOf(gift).find((p) => p.id === photoId);
  if (!photo) return null;
  return getMediaStore().get(photo.storageKey);
}

/** Removes every stored file for a gift (used on delete and retention). */
export async function deleteGiftMedia(gift: Pick<Gift, "photos">): Promise<void> {
  const keys = (gift.photos ?? []).map((p) => p.storageKey);
  if (keys.length) await getMediaStore().delete(keys);
}
