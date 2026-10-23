import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { addReply, notifyReply, ReplyError } from "@/lib/gifts/replies";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8_000;

/** The recipient writes back from the end of the gift. Public, token-scoped, JSON `{ message }`. */
export async function POST(req: Request, ctx: RouteContext<"/api/g/[token]/reply">) {
  const { token } = await ctx.params;
  const headers = { "Cache-Control": "no-store" };
  try {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) throw new ReplyError("That reply is too long.");
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) throw new ReplyError("That reply is too long.");
    let body: { message?: unknown };
    try {
      body = JSON.parse(raw) as { message?: unknown };
    } catch {
      throw new ReplyError("Something went wrong sending that. Please try again.");
    }
    const viewer = await getCurrentUser().catch(() => null);
    const { gift } = await addReply(token, body?.message, { viewerId: viewer?.id });
    after(() => notifyReply(gift).catch(() => console.warn("[reply-notice] failed", gift.id)));
    return NextResponse.json({ ok: true }, { status: 201, headers });
  } catch (err) {
    if (err instanceof ReplyError) return NextResponse.json({ error: err.message }, { status: err.status, headers });
    console.error("[reply] unexpected", err instanceof Error ? err.message : "error");
    return NextResponse.json({ error: "Something went wrong sending that. Please try again." }, { status: 500, headers });
  }
}
