"use server";

import { revalidatePath } from "next/cache";
import { AuthError, requireAdmin } from "@/lib/auth/guards";
import { getStore } from "@/lib/data";
import { RateLimitedError, startGeneration } from "@/lib/gifts/service";
import type { ActionResult } from "./gifts";

/** Admin retry of a failed generation. Uses the owner's rate-limit bucket. */
export async function adminRetryGiftAction(giftId: string): Promise<ActionResult<{ jobId: string }>> {
  try {
    const admin = await requireAdmin();
    const store = getStore();
    const gift = await store.gifts.get(giftId);
    if (!gift) return { ok: false, error: "Gift not found." };
    const owner = (await store.users.get(gift.ownerId)) ?? admin;
    const job = await startGeneration(owner, gift);
    revalidatePath("/admin/jobs");
    return { ok: true, data: { jobId: job.id } };
  } catch (err) {
    if (err instanceof AuthError || err instanceof RateLimitedError) return { ok: false, error: err.message };
    console.error("[actions:admin] retry", err instanceof Error ? err.message : err);
    return { ok: false, error: "Retry failed." };
  }
}
