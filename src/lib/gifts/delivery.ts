import "server-only";
import { getStore } from "@/lib/data";
import { env } from "@/lib/config/env";
import { emailConfigured, giftLinkEmail, sendEmail } from "@/lib/email";
import type { Gift, ScheduledDelivery, UserProfile } from "@/lib/domain/types";
import { newId, nowIso } from "@/lib/utils/ids";
import { publicGiftUrl } from "./links";

/**
 * Scheduled delivery: the gift link emailed to the recipient on a chosen day.
 *
 * Vercel's Hobby plan runs crons once a day, so delivery is by day, not by
 * minute: a delivery becomes due at 07:00 UTC on the chosen date and the daily
 * run (07:00–08:00 UTC) sends it, i.e. by 9am UK time all year. A more frequent
 * cron on /api/jobs/run sends it right at 07:00 UTC.
 */
export const DELIVERY_HOUR_UTC = 7;
export const MAX_DAYS_AHEAD = 366;

export class DeliveryError extends Error {
  constructor(message: string, public readonly field?: "to" | "sendOn") {
    super(message);
  }
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in the UK (YYYY-MM-DD). */
export function ukToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** First and last day a sender can pick: tomorrow (UK) to about a year ahead. */
export function deliveryWindow(now: Date = new Date()): { min: string; max: string } {
  const today = ukToday(now);
  return { min: addDays(today, 1), max: addDays(today, MAX_DAYS_AHEAD) };
}

export function sendAtFor(sendOn: string): string {
  return `${sendOn}T${String(DELIVERY_HOUR_UTC).padStart(2, "0")}:00:00.000Z`;
}

function isRealDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Who may have us email a recipient. Guest accounts are free to create, so
 * only paid gifts, real (signed-in) accounts or operators may, which keeps the
 * sender address from being used for spam.
 */
export async function mayEmailRecipient(user: UserProfile, gift: Gift): Promise<boolean> {
  if (user.kind === "supabase" || user.isAdmin) return true;
  const orders = await getStore().orders.listByGift(gift.id);
  return orders.some((o) => o.status !== "pending" && o.status !== "cancelled" && o.status !== "refunded" && o.paymentProvider === "stripe");
}

export function normaliseEmail(raw: unknown): string {
  const to = String(raw ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(to) || to.length > 254) throw new DeliveryError("Enter a valid email address.", "to");
  return to;
}

export async function scheduleDelivery(user: UserProfile, gift: Gift, input: { to: unknown; sendOn: unknown; note?: unknown }, now: Date = new Date()): Promise<ScheduledDelivery> {
  if (gift.status !== "active") throw new DeliveryError("Activate the gift before scheduling it.");
  if (!emailConfigured()) throw new DeliveryError("Email delivery isn't configured on this deployment.");
  if (!(await mayEmailRecipient(user, gift))) throw new DeliveryError("Scheduled delivery is available for paid gifts.");
  const to = normaliseEmail(input.to);
  const sendOn = String(input.sendOn ?? "");
  const { min, max } = deliveryWindow(now);
  if (!isRealDate(sendOn)) throw new DeliveryError("Choose a date.", "sendOn");
  if (sendOn < min) throw new DeliveryError("Choose tomorrow or later. To send today, use Send now.", "sendOn");
  if (sendOn > max) throw new DeliveryError("Choose a date within the next year.", "sendOn");
  const note = String(input.note ?? "").trim().slice(0, 300);

  const store = getStore();
  const limit = await store.rateLimit.hit(`schedule:${user.id}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) throw new DeliveryError("Too many changes in the last hour. Please try again later.");

  // One pending delivery per gift: a new date replaces the old one.
  for (const d of await store.deliveries.listByGift(gift.id)) {
    if (d.status === "scheduled") await store.deliveries.update(d.id, { status: "cancelled" });
  }
  const at = nowIso();
  const delivery = await store.deliveries.create({
    id: newId(),
    giftId: gift.id,
    ownerId: gift.ownerId,
    to,
    note,
    sendOn,
    sendAt: sendAtFor(sendOn),
    status: "scheduled",
    attempts: 0,
    lastError: null,
    emailId: null,
    sentAt: null,
    createdAt: at,
    updatedAt: at,
  });
  await store.audit.append({ id: newId(), at, actorId: user.id, action: "delivery.scheduled", subjectType: "gift", subjectId: gift.id, meta: { deliveryId: delivery.id, sendOn } });
  return delivery;
}

export async function cancelDelivery(user: UserProfile, gift: Gift, deliveryId: string): Promise<void> {
  const store = getStore();
  const d = await store.deliveries.get(deliveryId);
  if (!d || d.giftId !== gift.id) throw new DeliveryError("That delivery wasn't found.");
  if (d.status !== "scheduled") throw new DeliveryError(d.status === "sending" ? "It's being sent right now." : "That delivery isn't scheduled any more.");
  await store.deliveries.update(d.id, { status: "cancelled" });
  await store.audit.append({ id: newId(), at: nowIso(), actorId: user.id, action: "delivery.cancelled", subjectType: "gift", subjectId: gift.id, meta: { deliveryId: d.id } });
}

/** Cancels anything still waiting, e.g. when the link is revoked or the gift deleted. */
export async function cancelPendingDeliveries(giftId: string): Promise<number> {
  const store = getStore();
  let n = 0;
  for (const d of await store.deliveries.listByGift(giftId)) {
    if (d.status === "scheduled") {
      await store.deliveries.update(d.id, { status: "cancelled", lastError: "The link was turned off." });
      n++;
    }
  }
  return n;
}

/**
 * Sends every delivery that is due. Each one is claimed atomically first, so
 * overlapping runs never email twice. A failed send is retried once straight
 * away; after that it is marked failed for the sender to see and resend.
 */
export async function processDueDeliveries(now: Date = new Date(), limit = 50): Promise<{ sent: number; failed: number }> {
  const store = getStore();
  const nowStr = now.toISOString();
  let sent = 0;
  let failed = 0;
  for (const due of await store.deliveries.listDue(nowStr, limit)) {
    const d = await store.deliveries.claim(due.id, nowStr);
    if (!d) continue;
    const gift = await store.gifts.get(d.giftId);
    const live = gift && gift.status === "active" && (!gift.expiresAt || gift.expiresAt > nowStr);
    if (!gift || !live) {
      await store.deliveries.update(d.id, { status: "failed", lastError: "The gift link wasn't live on the day, so nothing was sent." });
      failed++;
      continue;
    }
    if (!env.emailConfigured) {
      await store.deliveries.update(d.id, { status: "failed", lastError: "Email delivery isn't configured." });
      failed++;
      continue;
    }
    let attempts = d.attempts;
    let result = null;
    for (let i = 0; i < 2; i++) {
      attempts++;
      result = await sendEmail(giftLinkEmail({ to: d.to, recipientName: gift.input.recipientName, senderName: gift.input.senderName, url: publicGiftUrl(gift), note: d.note || undefined, giftId: gift.id }));
      if (result.status === "sent") break;
    }
    if (result?.status === "sent") {
      await store.deliveries.update(d.id, { status: "sent", attempts, sentAt: nowIso(), emailId: result.id, lastError: null });
      sent++;
    } else {
      await store.deliveries.update(d.id, { status: "failed", attempts, emailId: result?.id ?? null, lastError: "The email provider didn't accept the message." });
      failed++;
    }
    console.info("[delivery]", d.id, result?.status ?? "none");
  }
  return { sent, failed };
}

/** What the sender's share panel needs (owner's own data only). */
export async function deliveryPanelData(user: UserProfile, gift: Gift) {
  const deliveries = await getStore().deliveries.listByGift(gift.id);
  return {
    canEmail: await mayEmailRecipient(user, gift),
    deliveries: deliveries.map(({ id, to, sendOn, status, sentAt, lastError }) => ({ id, to, sendOn, status, sentAt, lastError })),
    window: deliveryWindow(),
  };
}
