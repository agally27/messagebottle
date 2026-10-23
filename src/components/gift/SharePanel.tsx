"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { activateDemoAction, regenerateLinkAction, revokeGiftAction } from "@/lib/actions/gifts";
import { DeliveryPanel, type DeliverySummary } from "./DeliveryPanel";
import type { GiftStatus } from "@/lib/domain/types";

interface Props {
  giftId: string;
  status: GiftStatus;
  url: string;
  recipientName: string;
  /** True only when demo checkout is available (DEMO_MODE and no Stripe keys). */
  demoMode: boolean;
  checkoutAvailable: boolean;
  /** Physical keepsakes are on sale (PHYSICAL_PRODUCTS=on). */
  physicalAvailable: boolean;
  hasPaidOrder: boolean;
  openCount: number;
  lastOpenedAt: string | null;
  emailAvailable: boolean;
  delivery: { canEmail: boolean; deliveries: DeliverySummary[]; window: { min: string; max: string } };
}

export function SharePanel({ giftId, status, url, recipientName, demoMode, checkoutAvailable, physicalAvailable, hasPaidOrder, openCount, lastOpenedAt, emailAvailable, delivery }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        setNotice({ tone: "success", text: success });
        router.refresh();
      } else setNotice({ tone: "danger", text: r.error ?? "Something went wrong." });
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice({ tone: "success", text: "Link copied." });
    } catch {
      setNotice({ tone: "info", text: "Select the link and copy it manually." });
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: `A message for ${recipientName}`, text: `${recipientName}, someone has a message for you.`, url });
    } catch {
      /* cancelled */
    }
  };

  if (status === "ready") {
    return (
      <div className="space-y-4">
        <p className="text-text-muted">Happy with the preview? Choose how to send it. The private link only works once the gift is activated.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {checkoutAvailable ? (
            <Button href={physicalAvailable ? `/gifts/${giftId}/send` : `/checkout/${giftId}?product=digital`} size="lg">
              {physicalAvailable ? "Choose a gift & checkout" : "Continue to checkout"}
            </Button>
          ) : null}
          {demoMode ? (
            <Button variant={checkoutAvailable ? "secondary" : "primary"} size="lg" disabled={pending} onClick={() => run(() => activateDemoAction(giftId), "Your gift is live. Share the link below.")}>
              {pending ? "Activating…" : "Activate link (demo, no payment)"}
            </Button>
          ) : null}
        </div>
        {demoMode ? <Notice tone="demo">Demo mode: activation is free here so you can try the whole journey. In production this step is unlocked by checkout.</Notice> : null}
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      </div>
    );
  }

  if (status === "revoked") {
    return (
      <div className="space-y-4">
        <Notice tone="warning" title="Link revoked">Anyone with the old link now sees a “not available” page. You can issue a fresh link at any time.</Notice>
        <Button disabled={pending} onClick={() => run(() => regenerateLinkAction(giftId), "A new link is live.")}>
          Issue a new link
        </Button>
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      </div>
    );
  }

  if (status === "active") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-cream p-3 sm:flex-row sm:items-center">
          <input readOnly value={url} aria-label="Private gift link" onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-ink" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void copy()}>
              Copy link
            </Button>
            {canShare ? (
              <Button size="sm" variant="secondary" onClick={() => void share()}>
                Share…
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-text-muted">
          {openCount === 0 ? "Not opened yet." : `Opened ${openCount} ${openCount === 1 ? "time" : "times"}${lastOpenedAt ? `, last on ${new Date(lastOpenedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}.`}
          {hasPaidOrder ? " Paid." : demoMode ? " Activated in demo mode." : ""}
        </p>
        <DeliveryPanel giftId={giftId} recipientName={recipientName} emailAvailable={emailAvailable} canEmail={delivery.canEmail} deliveries={delivery.deliveries} window={delivery.window} />
        <div className="flex flex-wrap gap-3">
          <Button href={url} variant="secondary" size="sm" target="_blank" rel="noopener">
            Open as the recipient
          </Button>
          {checkoutAvailable && physicalAvailable ? (
            <Button href={`/gifts/${giftId}/send`} variant="secondary" size="sm">
              Add a physical bottle
            </Button>
          ) : null}
          <Button href={`/gifts/${giftId}/print`} variant="secondary" size="sm" target="_blank" rel="noopener">
            Print message & QR
          </Button>
          {!confirmRevoke ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirmRevoke(true)}>
              Revoke link
            </Button>
          ) : (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-text-muted">Stop this link working?</span>
              <Button variant="danger" size="sm" disabled={pending} onClick={() => { setConfirmRevoke(false); run(() => revokeGiftAction(giftId), "Link revoked."); }}>
                Yes, revoke
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmRevoke(false)}>
                Keep
              </Button>
            </span>
          )}
        </div>
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      </div>
    );
  }

  return null;
}
