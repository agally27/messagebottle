import { NextResponse } from "next/server";
import { getStore } from "@/lib/data";
import { readPhoto } from "@/lib/gifts/photos";
import { isPlausibleToken, nowIso } from "@/lib/utils/ids";

export const dynamic = "force-dynamic";

/** Recipient view of a photo: only for an active, unexpired gift reached by its private token. */
export async function GET(_req: Request, ctx: RouteContext<"/api/g/[token]/photos/[photoId]">) {
  const { token, photoId } = await ctx.params;
  const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isPlausibleToken(token)) return notFound();
  const gift = await getStore().gifts.getByPublicToken(token);
  if (!gift || gift.status !== "active" || (gift.expiresAt && gift.expiresAt < nowIso())) return notFound();
  const file = await readPhoto(gift, photoId);
  if (!file) return notFound();
  return new NextResponse(new Uint8Array(file.data), {
    headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" },
  });
}
