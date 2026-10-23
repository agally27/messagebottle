import "server-only";
import { env } from "@/lib/config/env";
import { getStore } from "@/lib/data";
import { giftReplyEmail, sendEmail } from "@/lib/email";
import type { Gift, GiftReply } from "@/lib/domain/types";
import { isPlausibleToken, newId, nowIso } from "@/lib/utils/ids";

/**
 * Replies: the recipient writes a short private note back to the sender from
 * the end of the gift. Anyone holding the private link can reply (there is no
 * recipient account), so replies are limited per gift and per hour, are plain
 * text, and are only ever shown to the sender. Never logged.
 */
export const REPLY_MAX = 1000;
export const MAX_REPLIES_PER_GIFT = 30;
const REPLIES_PER_HOUR = 5;

export class ReplyError extends Error {
  constructor(message: string, public readonly status: 400 | 403 | 404 | 409 | 429 = 400) {
    super(message);
  }
}

/** Plain text only: no control characters, at most one blank line in a row. */
export function cleanReply(raw: unknown): string {
  const text = String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮⁦-⁩]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) throw new ReplyError("Write a few words first.");
  if (text.length > REPLY_MAX) throw new ReplyError(`Keep it under ${REPLY_MAX} characters.`);
  return text;
}

export async function addReply(token: string, raw: unknown, opts: { viewerId?: string | null } = {}): Promise<{ reply: GiftReply; gift: Gift }> {
  if (!isPlausibleToken(token)) throw new ReplyError("This gift isn't available.", 404);
  const store = getStore();
  const gift = await store.gifts.getByPublicToken(token);
  const now = nowIso();
  if (!gift || gift.status !== "active" || (gift.expiresAt && gift.expiresAt <= now)) throw new ReplyError("This gift isn't available.", 404);
  if (opts.viewerId && opts.viewerId === gift.ownerId) throw new ReplyError("This is your own gift, so there's no one to reply to.", 403);
  const message = cleanReply(raw);
  const limit = await store.rateLimit.hit(`reply:${gift.id}`, REPLIES_PER_HOUR, 60 * 60 * 1000);
  if (!limit.allowed) throw new ReplyError("That's a lot of replies at once. Please try again a little later.", 429);
  if ((await store.replies.countByGift(gift.id)) >= MAX_REPLIES_PER_GIFT) throw new ReplyError("This gift can't take any more replies.", 409);
  const reply = await store.replies.create({ id: newId(), giftId: gift.id, ownerId: gift.ownerId, message, createdAt: now, readAt: null });
  await store.audit.append({ id: newId(), at: now, actorId: null, action: "reply.received", subjectType: "gift", subjectId: gift.id, meta: { replyId: reply.id } });
  return { reply, gift };
}

/**
 * Tells the sender a reply arrived (follows their "email me" choice for the
 * gift). At most one email per gift every 30 minutes; it never includes the
 * reply itself, which they read on their gift page.
 */
export async function notifyReply(gift: Gift): Promise<"sent" | "failed" | "skipped"> {
  if (gift.notifyOnOpen === false || !env.emailConfigured) return "skipped";
  const store = getStore();
  const owner = await store.users.get(gift.ownerId);
  if (!owner?.email) return "skipped";
  const throttle = await store.rateLimit.hit(`reply-email:${gift.id}`, 1, 30 * 60 * 1000);
  if (!throttle.allowed) return "skipped";
  const result = await sendEmail(giftReplyEmail({ to: owner.email, recipientName: gift.input.recipientName, giftUrl: `${env.appUrl}/gifts/${gift.id}#replies`, giftId: gift.id }));
  console.info("[reply-notice]", gift.id, result.status);
  return result.status === "sent" ? "sent" : "failed";
}

/** Replies for the sender's gift page; marks them read, returning which were new. */
export async function repliesForOwner(gift: Gift): Promise<Array<{ id: string; message: string; createdAt: string; isNew: boolean }>> {
  const store = getStore();
  const replies = await store.replies.listByGift(gift.id);
  if (replies.some((r) => !r.readAt)) await store.replies.markRead(gift.id, nowIso());
  return replies.map((r) => ({ id: r.id, message: r.message, createdAt: r.createdAt, isNew: !r.readAt }));
}
