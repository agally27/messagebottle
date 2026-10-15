import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/config/env";
import { processDueJobs, sweepAbandonedGifts } from "@/lib/jobs/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron / operator endpoint: runs due generation jobs. Protected by JOBS_SECRET
 * (Authorization: Bearer …). Vercel Cron sends the CRON_SECRET header the
 * same way when configured. Disabled entirely when no secret is set.
 */
export async function POST(req: Request) {
  const secret = env.JOBS_SECRET;
  if (!secret) return NextResponse.json({ error: "JOBS_SECRET is not configured" }, { status: 503 });
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const ran = await processDueJobs(5);
  const url = new URL(req.url);
  const sweep = url.searchParams.get("sweep") === "1" ? await sweepAbandonedGifts(env.DRAFT_RETENTION_DAYS) : [];
  return NextResponse.json({ ran, sweptGifts: sweep });
}

export const GET = POST;
