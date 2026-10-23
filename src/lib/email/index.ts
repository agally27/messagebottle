import "server-only";
import { env } from "@/lib/config/env";
import { getStore } from "@/lib/data";
import type { EmailDelivery } from "@/lib/domain/types";
import { newId, nowIso } from "@/lib/utils/ids";

interface SendInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  template: string;
  giftId?: string | null;
  orderId?: string | null;
}

export function emailConfigured(): boolean {
  return env.emailConfigured;
}

/**
 * Sends through Resend when configured and records the delivery either way.
 * Never claims success unless the provider accepted the message.
 */
export async function sendEmail(input: SendInput): Promise<EmailDelivery> {
  const store = getStore();
  const base: EmailDelivery = {
    id: newId(),
    giftId: input.giftId ?? null,
    orderId: input.orderId ?? null,
    to: input.to,
    template: input.template,
    provider: env.emailConfigured ? "resend" : "none",
    status: "queued",
    providerMessageId: null,
    error: null,
    createdAt: nowIso(),
  };
  if (!env.emailConfigured || !env.RESEND_API_KEY) {
    return store.emails.create({ ...base, status: "skipped", error: "No email provider configured" });
  }
  await store.emails.create(base);
  try {
    const res = await fetch(`${env.RESEND_API_URL.replace(/\/$/, "")}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const updated = await store.emails.update(base.id, { status: "failed", error: `HTTP ${res.status} ${detail.slice(0, 200)}` });
      return updated ?? base;
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    const updated = await store.emails.update(base.id, { status: "sent", providerMessageId: data.id ?? null });
    return updated ?? base;
  } catch (err) {
    const updated = await store.emails.update(base.id, { status: "failed", error: err instanceof Error ? err.message : "send failed" });
    return updated ?? base;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function giftLinkEmail(opts: { to: string; recipientName: string; senderName: string; url: string; note?: string; giftId: string }): SendInput {
  const subject = `${opts.senderName} has a message for you`;
  const note = opts.note?.trim();
  const text = [`${opts.recipientName},`, "", `${opts.senderName} made something for you. Open it here:`, opts.url, "", note ? `"${note}"` : "", "", "Message in a Bottle — more than a message. A feeling, made for you."].filter((l) => l !== undefined).join("\n");
  const html = `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1c2333;background:#fbf8f1"><p style="font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:#3e7f86">For ${escapeHtml(opts.recipientName)}</p><h1 style="font-weight:400;font-size:28px;margin:8px 0 16px">${escapeHtml(opts.senderName)} has a message for you.</h1>${note ? `<p style="font-size:16px;line-height:1.6;color:#5b6578;font-style:italic">“${escapeHtml(note)}”</p>` : ""}<p style="margin:28px 0"><a href="${escapeHtml(opts.url)}" style="display:inline-block;background:#14213d;color:#f4efe4;text-decoration:none;padding:14px 24px;border-radius:999px;font-family:sans-serif;font-weight:600">Open the bottle</a></p><p style="font-size:12px;color:#8b94a5">Or copy this link: ${escapeHtml(opts.url)}</p><p style="font-size:12px;color:#8b94a5;margin-top:32px">Message in a Bottle — more than a message. A feeling, made for you.</p></div>`;
  return { to: opts.to, subject, text, html, template: "gift-link", giftId: opts.giftId };
}

export function orderConfirmationEmail(opts: { to: string; orderRef: string; items: string[]; totalText: string; physical: boolean; orderId: string; giftId: string }): SendInput {
  const subject = `Your Message in a Bottle order ${opts.orderRef}`;
  const text = [`Thank you for your order ${opts.orderRef}.`, "", ...opts.items.map((i) => `• ${i}`), "", `Total: ${opts.totalText}`, "", opts.physical ? "We'll email you again when your keepsake is dispatched." : "Your private link is live — share it from My gifts.", ""].join("\n");
  const html = `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1c2333;background:#fbf8f1"><h1 style="font-weight:400;font-size:26px">Thank you for your order</h1><p style="color:#5b6578">Reference ${escapeHtml(opts.orderRef)}</p><ul>${opts.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul><p><strong>Total: ${escapeHtml(opts.totalText)}</strong></p><p style="color:#5b6578">${opts.physical ? "We'll email you again when your keepsake is dispatched." : "Your private link is live — share it from My gifts."}</p></div>`;
  return { to: opts.to, subject, text, html, template: "order-confirmation", orderId: opts.orderId, giftId: opts.giftId };
}
