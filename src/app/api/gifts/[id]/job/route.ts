import { NextResponse } from "next/server";
import { AuthError, requireOwnedGift, requireUser } from "@/lib/auth/guards";
import { getGenerationStatus } from "@/lib/gifts/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/gifts/[id]/job">) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const gift = await requireOwnedGift(id, user);
    const status = await getGenerationStatus(gift);
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api] job status", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Unable to load status" }, { status: 500 });
  }
}
