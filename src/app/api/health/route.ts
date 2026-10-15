import { NextResponse } from "next/server";
import { configurationSummary } from "@/lib/config/env";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Liveness for everyone; configuration flags (booleans only) for admins. */
export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  const body: Record<string, unknown> = { ok: true, time: new Date().toISOString() };
  if (user?.isAdmin) body.config = configurationSummary();
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
