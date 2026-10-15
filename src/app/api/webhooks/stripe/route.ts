import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { handleStripeEvent, verifyStripeSignature } from "@/lib/payments/webhook";

export const dynamic = "force-dynamic";

/** Stripe webhook: signature-verified, idempotent. Always answers quickly. */
export async function POST(req: Request) {
  if (!env.stripeConfigured) return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  const raw = await req.text();
  let event;
  try {
    event = verifyStripeSignature(raw, req.headers.get("stripe-signature"));
  } catch (err) {
    console.warn("[webhook] signature rejected", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    const outcome = await handleStripeEvent({ id: event.id, type: event.type, data: { object: event.data.object as unknown as Record<string, unknown> } });
    if (!outcome.handled) console.warn("[webhook] unhandled", { id: event.id, type: event.type, reason: outcome.reason });
    return NextResponse.json({ received: true, ...outcome });
  } catch (err) {
    // 500 makes Stripe retry; handleStripeEvent released the event id so the retry is processed.
    console.error("[webhook] handler failed", { id: event.id, type: event.type, message: err instanceof Error ? err.message : err });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
