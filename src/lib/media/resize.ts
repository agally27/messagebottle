/**
 * Browser-side: shrink a photo to at most `maxEdge` px and re-encode as JPEG
 * before upload. Keeps uploads small (mobile photos are often 3–8 MB) and drops
 * EXIF metadata such as GPS location. Falls back to the original file if the
 * browser can't decode it (the server re-encodes anyway).
 */
export async function shrinkPhoto(file: File, maxEdge = 2000, quality = 0.86): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Uploads one photo to a gift; retries once on network failure. */
export async function uploadPhoto(giftId: string, file: File, meta: { caption: string; year: number | null }): Promise<{ ok: true } | { ok: false; error: string }> {
  const blob = await shrinkPhoto(file);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const form = new FormData();
      form.set("file", blob, file.name.replace(/\.[^.]+$/, "") + ".jpg");
      form.set("caption", meta.caption);
      if (meta.year) form.set("year", String(meta.year));
      const res = await fetch(`/api/gifts/${giftId}/photos`, { method: "POST", body: form });
      if (res.ok) return { ok: true };
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status < 500) return { ok: false, error: body.error ?? "Upload failed." };
    } catch {
      /* retry */
    }
  }
  return { ok: false, error: "Upload failed. Check your connection and try again." };
}
