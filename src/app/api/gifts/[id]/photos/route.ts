import { NextResponse } from "next/server";
import { AuthError, requireOwnedGift, requireUser } from "@/lib/auth/guards";
import { addPhoto, MAX_UPLOAD_BYTES, PhotoError } from "@/lib/gifts/photos";

export const dynamic = "force-dynamic";

/** Owner uploads one photo (multipart: file, caption?, year?). */
export async function POST(req: Request, ctx: RouteContext<"/api/gifts/[id]/photos">) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const gift = await requireOwnedGift(id, user);
    const length = Number(req.headers.get("content-length") ?? 0);
    if (length > MAX_UPLOAD_BYTES + 64_000) throw new PhotoError("That photo is too large. Try a smaller one.", 413);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new PhotoError("No photo was attached.");
    const yearRaw = Number(form.get("year") ?? "");
    const photo = await addPhoto(gift, { data: Buffer.from(await file.arrayBuffer()), type: file.type }, { caption: String(form.get("caption") ?? ""), year: Number.isFinite(yearRaw) && yearRaw > 0 ? yearRaw : null });
    return NextResponse.json({ photo: { id: photo.id, caption: photo.caption, year: photo.year, width: photo.width, height: photo.height } }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError || err instanceof PhotoError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api] photo upload", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
