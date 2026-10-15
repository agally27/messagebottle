"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError, requireOwnedGift, requireUser } from "@/lib/auth/guards";
import { demoAuthEnabled, getCurrentUser, signInDemoUser } from "@/lib/auth/session";
import { formatIssues, giftInputSchema } from "@/lib/domain/schemas";
import { activateGift, applyGiftSettings, applyStoryEdits, createGift, deleteGift, RateLimitedError, regenerateLink, revokeGift, startGeneration } from "@/lib/gifts/service";
import { env } from "@/lib/config/env";
import { ZodError } from "zod";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fail(err: unknown): ActionResult<never> {
  if (err instanceof ZodError) return { ok: false, error: "Some details need attention.", fieldErrors: formatIssues(err) };
  if (err instanceof RateLimitedError) return { ok: false, error: `${err.message} (resets ${new Date(err.resetAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })})` };
  if (err instanceof AuthError) return { ok: false, error: err.message };
  console.error("[actions] unexpected", err instanceof Error ? err.message : err);
  return { ok: false, error: "Something went wrong. Your details are safe — please try again." };
}

/**
 * Creates the gift and queues generation. In demo mode a guest session is
 * created on the fly so the journey never hits a sign-in wall.
 */
export async function createGiftAction(rawInput: unknown, options: { productId?: string | null } = {}): Promise<ActionResult<{ giftId: string }>> {
  let giftId: string;
  try {
    const parsed = giftInputSchema.parse(rawInput);
    let user = await getCurrentUser();
    if (!user) {
      if (!demoAuthEnabled()) return { ok: false, error: "Please sign in to create a gift." };
      user = await signInDemoUser(parsed.senderName);
    }
    const gift = await createGift(user, parsed, { productId: options.productId ?? null });
    await startGeneration(user, gift);
    giftId = gift.id;
  } catch (err) {
    return fail(err);
  }
  redirect(`/gifts/${giftId}/generating`);
}

export async function retryGenerationAction(giftId: string): Promise<ActionResult<{ jobId: string }>> {
  try {
    const user = await requireUser();
    const gift = await requireOwnedGift(giftId, user);
    const job = await startGeneration(user, gift);
    revalidatePath(`/gifts/${giftId}`);
    return { ok: true, data: { jobId: job.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function saveStoryEditsAction(giftId: string, edits: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await requireOwnedGift(giftId, user);
    await applyStoryEdits(gift, edits);
    revalidatePath(`/gifts/${giftId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function saveGiftSettingsAction(giftId: string, edits: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await requireOwnedGift(giftId, user);
    await applyGiftSettings(gift, edits);
    revalidatePath(`/gifts/${giftId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

/** Demo-only: activates the link without payment. Refused outside demo mode. */
export async function activateDemoAction(giftId: string): Promise<ActionResult> {
  try {
    if (!env.demoMode) return { ok: false, error: "Demo activation is disabled. Complete checkout to send this gift." };
    const user = await requireUser();
    const gift = await requireOwnedGift(giftId, user);
    await activateGift(gift, "demo");
    revalidatePath(`/gifts/${giftId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function revokeGiftAction(giftId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await requireOwnedGift(giftId, user);
    await revokeGift(gift);
    revalidatePath(`/gifts/${giftId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function regenerateLinkAction(giftId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await requireOwnedGift(giftId, user);
    if (gift.status !== "active" && gift.status !== "revoked") return { ok: false, error: "This gift hasn't been sent yet." };
    await regenerateLink(gift);
    revalidatePath(`/gifts/${giftId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteGiftAction(giftId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await requireOwnedGift(giftId, user);
    await deleteGift(gift);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
