import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { AuthError, requireUser } from "@/lib/auth/guards";
import { getStore } from "@/lib/data";
import { publicGiftUrl } from "@/lib/gifts/service";

export const dynamic = "force-dynamic";

/**
 * PNG QR code for a gift's private link. The link is the secret, so this is
 * only available to the gift's owner or an admin.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/gifts/[id]/qr">) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const gift = await getStore().gifts.get(id);
    if (!gift || (gift.ownerId !== user.id && !user.isAdmin)) throw new AuthError(404, "Gift not found.");
    const size = Math.min(1024, Math.max(128, Number(new URL(req.url).searchParams.get("size") ?? 512) || 512));
    const png = await QRCode.toBuffer(publicGiftUrl(gift), { type: "png", width: size, margin: 2, errorCorrectionLevel: "M", color: { dark: "#14213dff", light: "#ffffffff" } });
    return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="bottle-${gift.id.slice(0, 8)}.png"` } });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api] qr", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Unable to render QR code" }, { status: 500 });
  }
}
