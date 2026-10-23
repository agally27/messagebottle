import "server-only";
import { env } from "@/lib/config/env";
import { getStore } from "@/lib/data";
import { giftOpenedEmail, sendEmail } from "@/lib/email";
import type { Gift } from "@/lib/domain/types";

export type OpenNotice = "sent" | "failed" | "off" | "no-email-provider" | "no-address" | "already-sent";

/**
 * Emails the sender the first time their gift is opened. Sent at most once per
 * gift (claimed atomically before sending); skipped when the sender turned it
 * off or has no email address (guest accounts).
 */
export async function notifyGiftOpened(gift: Gift, openedAt: string): Promise<OpenNotice> {
  if (gift.notifyOnOpen === false) return "off";
  if (!env.emailConfigured) return "no-email-provider";
  const store = getStore();
  const owner = await store.users.get(gift.ownerId);
  if (!owner?.email) return "no-address";
  if (!(await store.gifts.claimOpenNotification(gift.id, openedAt))) return "already-sent";
  const result = await sendEmail(giftOpenedEmail({ to: owner.email, recipientName: gift.input.recipientName, openedAt, giftUrl: `${env.appUrl}/gifts/${gift.id}`, giftId: gift.id }));
  console.info("[open-notice]", gift.id, result.status);
  return result.status === "sent" ? "sent" : "failed";
}

/** What the sender's share panel shows for the "opened" email (the viewer is the owner). */
export function openNoticePanel(owner: { email: string | null }, gift: Gift): { email: string; on: boolean; sentAt: string | null } | null {
  if (!env.emailConfigured || !owner.email) return null;
  return { email: owner.email, on: gift.notifyOnOpen !== false, sentAt: gift.openNotifiedAt ?? null };
}
