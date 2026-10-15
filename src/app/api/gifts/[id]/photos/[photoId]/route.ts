import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth/guards";
import { getStore } from "@/lib/data";
import { readPhoto } from "@/lib/gifts/photos";

export const dynamic = "force-dynamic";

/** Owner (preview, editor) or admin (fulfilment printing) view of a photo. */
export async function GET(_req: Request, ctx: RouteContext<"/api/gifts/[id]/photos/[photoId]">) {
  try {
    const { id, photoId } = await ctx.params;
    const user = await requireUser();
    const gift = await getStore().gifts.get(id);
    if (!gift || (gift.ownerId !== user.id && !user.isAdmin)) throw new AuthError(404, "Not found.");
    const file = await readPhoto(gift, photoId);
    if (!file) throw new AuthError(404, "Not found.");
    return new NextResponse(new Uint8Array(file.data), { headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=600", "X-Content-Type-Options": "nosniff" } });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}
