import { NextResponse } from "next/server";
import { recordGiftOpen } from "@/lib/gifts/service";

export const dynamic = "force-dynamic";

/** Called when the recipient taps "Open the bottle". Public, token-scoped, no body. */
export async function POST(_req: Request, ctx: RouteContext<"/api/g/[token]/open">) {
  const { token } = await ctx.params;
  const ok = await recordGiftOpen(token).catch(() => false);
  return NextResponse.json({ ok }, { headers: { "Cache-Control": "no-store" } });
}
