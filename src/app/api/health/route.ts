import { NextResponse } from "next/server";
import { configurationSummary } from "@/lib/config/env";

export const dynamic = "force-dynamic";

/** Liveness + non-secret configuration flags. */
export async function GET() {
  return NextResponse.json({ ok: true, time: new Date().toISOString(), config: configurationSummary() }, { headers: { "Cache-Control": "no-store" } });
}
