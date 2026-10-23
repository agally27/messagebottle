import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { recordGiftOpen } from "@/lib/gifts/service";
import { notifyGiftOpened } from "@/lib/gifts/notifications";

export const dynamic = "force-dynamic";

/**
 * Called when the recipient taps "Open the bottle". Public, token-scoped, no
 * body. The sender's own views aren't counted. On the first open, the sender
 * is emailed after the response (if they asked to be).
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/g/[token]/open">) {
  const { token } = await ctx.params;
  const viewer = await getCurrentUser().catch(() => null);
  const result = await recordGiftOpen(token, { viewerId: viewer?.id }).catch(() => null);
  if (result?.firstOpen && result.gift) {
    const { gift, at } = result;
    after(() => notifyGiftOpened(gift, at).catch((err) => console.warn("[open-notice] failed", gift.id, err instanceof Error ? err.message : "error")));
  }
  return NextResponse.json({ ok: Boolean(result?.counted) }, { headers: { "Cache-Control": "no-store" } });
}
