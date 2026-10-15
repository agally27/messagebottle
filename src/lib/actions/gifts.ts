"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError, requireOwnedGift, requireUser } from "@/lib/auth/guards";
import { demoAuthEnabled, getCurrentUser, signInDemoUser } from "@/lib/auth/session";
import { formatIssues, giftInputSchema } from "@/lib/domain/schemas";
import { activateGift, applyGiftSettings, applyStoryEdits, createGift, deleteGift, publicGiftUrl, RateLimitedError, regenerateLink, revokeGift, startGeneration } from "@/lib/gifts/service";
import { getStore } from "@/lib/data";
import { demoCheckoutAvailable } from "@/lib/payments/checkout";
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
    if (gift.status !== "failed" && gift.status !== "draft" && gift.status !== "generating") return { ok: false, error: "This gift is already complete. Edit it from the gift page." };
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
    if (!demoCheckoutAvailable()) return { ok: false, error: "Demo activation is disabled. Complete checkout to send this gift." };
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

/** Emails the private link to the recipient. Only reports success when the provider accepted it. */
export async function sendGiftEmailAction(giftId: string, input: { to: string; note?: string }): Promise<ActionResult<{ status: string }>> {
  try {
    const user = await requireUser();
    const gift = await requireOwnedGift(giftId, user);
    if (gift.status !== "active") return { ok: false, error: "Activate the gift before sending it." };
    const to = String(input.to ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: "Enter a valid email address.", fieldErrors: { to: "Enter a valid email address." } };
    const { emailConfigured, giftLinkEmail, sendEmail } = await import("@/lib/email");
    if (!emailConfigured()) return { ok: false, error: "Email delivery isn't configured on this deployment. Copy the link and send it yourself." };
    // Guest accounts are free to create, so only paid gifts (or real accounts) may send email, and only a few per hour.
    const orders = await getStore().orders.listByGift(gift.id);
    const paid = orders.some((o) => o.status !== "pending" && o.status !== "cancelled" && o.status !== "refunded" && o.paymentProvider === "stripe");
    if (!paid && user.kind !== "supabase") return { ok: false, error: "Email delivery is available for paid gifts. Copy the link and send it yourself." };
    const limit = await getStore().rateLimit.hit(`email:${user.id}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) return { ok: false, error: "Too many emails sent in the last hour." };
    const delivery = await sendEmail(giftLinkEmail({ to, recipientName: gift.input.recipientName, senderName: gift.input.senderName, url: publicGiftUrl(gift), note: input.note?.slice(0, 300), giftId: gift.id }));
    if (delivery.status !== "sent") return { ok: false, error: "The email couldn't be sent. Copy the link and send it yourself." };
    return { ok: true, data: { status: delivery.status } };
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
