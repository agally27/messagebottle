"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { OptionCard } from "@/components/ui/OptionCard";
import { cancelDeliveryAction, scheduleDeliveryAction, sendGiftEmailAction } from "@/lib/actions/gifts";
import type { ScheduledDelivery } from "@/lib/domain/types";

export type DeliverySummary = Pick<ScheduledDelivery, "id" | "to" | "sendOn" | "status" | "sentAt" | "lastError">;

interface Props {
  giftId: string;
  recipientName: string;
  /** An email provider is configured on this deployment. */
  emailAvailable: boolean;
  /** This sender may have us email the recipient (paid gift, real account or operator). */
  canEmail: boolean;
  deliveries: DeliverySummary[];
  /** Selectable days (YYYY-MM-DD, UK): tomorrow to about a year ahead. */
  window: { min: string; max: string };
}

const longDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

/** Email the link now, or on the morning of a chosen day. */
export function DeliveryPanel({ giftId, recipientName, emailAvailable, canEmail, deliveries, window }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [when, setWhen] = useState<"now" | "date">("now");
  const [sendOn, setSendOn] = useState(window.min);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const scheduled = deliveries.find((d) => d.status === "scheduled" || d.status === "sending");
  const history = deliveries.filter((d) => d.status === "sent" || d.status === "failed").slice(0, 3);
  const enabled = emailAvailable && canEmail;

  const submit = () =>
    startTransition(async () => {
      setErrors({});
      setNotice(null);
      const r = when === "now" ? await sendGiftEmailAction(giftId, { to, note }) : await scheduleDeliveryAction(giftId, { to, sendOn, note });
      if (r.ok) {
        setNotice({ tone: "success", text: when === "now" ? `Sent to ${to.trim()}.` : `Scheduled for ${longDate(sendOn)}.` });
        setTo("");
        setNote("");
        setWhen("now");
        router.refresh();
      } else {
        setNotice({ tone: "danger", text: r.error });
        if (r.fieldErrors) setErrors(r.fieldErrors);
      }
    });

  const cancel = (id: string) =>
    startTransition(async () => {
      const r = await cancelDeliveryAction(giftId, id);
      setNotice(r.ok ? { tone: "success", text: "Scheduled email cancelled." } : { tone: "danger", text: r.error });
      if (r.ok) router.refresh();
    });

  return (
    <section aria-labelledby="delivery-heading" className="rounded-lg border border-line p-4">
      <h3 id="delivery-heading" className="text-base font-semibold text-ink">
        Email it to {recipientName}
      </h3>
      {!emailAvailable ? (
        <p className="mt-1 text-sm text-text-muted">Email delivery isn&apos;t set up on this site yet. Copy the link instead.</p>
      ) : !canEmail ? (
        <p className="mt-1 text-sm text-text-muted">Email delivery is available once the gift is paid for. Copy the link instead.</p>
      ) : (
        <p className="mt-1 text-sm text-text-muted">Send it now, or pick a day: a birthday, an anniversary, Christmas morning.</p>
      )}

      {scheduled ? (
        <div className="mt-4 flex flex-col gap-3 rounded-md border border-gold/50 bg-gold-pale/50 p-3 sm:flex-row sm:items-center sm:justify-between" data-testid="scheduled-delivery">
          <p className="text-sm text-ink">
            <span className="font-semibold">{scheduled.status === "sending" ? "Sending now" : "Scheduled"}:</span> arrives {longDate(scheduled.sendOn)}, by 9am UK time, to {scheduled.to}.
          </p>
          {scheduled.status === "scheduled" ? (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => cancel(scheduled.id)}>
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}

      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field id="delivery-to" label="Their email address" error={errors.to}>
          <Input id="delivery-to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="their@email.com" autoComplete="off" disabled={!enabled} invalid={Boolean(errors.to)} />
        </Field>
        <Field id="delivery-note" label="A line for the email" optional hint="Shown above the button that opens the gift." counter={`${note.length} / 300`}>
          <Textarea id="delivery-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} disabled={!enabled} className="min-h-[4rem]" />
        </Field>
        <fieldset disabled={!enabled}>
          <legend className="text-sm font-semibold text-ink">When</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="When">
            <OptionCard name="when" value="now" checked={when === "now"} onChange={() => setWhen("now")} title="Send now" description="It arrives in a minute or two." compact disabled={!enabled} />
            <OptionCard name="when" value="date" checked={when === "date"} onChange={() => setWhen("date")} title="On a date" description="That morning, by 9am UK time." compact disabled={!enabled} />
          </div>
        </fieldset>
        {when === "date" ? (
          <Field id="delivery-date" label="Day" error={errors.sendOn} hint={scheduled ? "This replaces the delivery already scheduled." : undefined}>
            <Input id="delivery-date" type="date" value={sendOn} min={window.min} max={window.max} onChange={(e) => setSendOn(e.target.value)} disabled={!enabled} invalid={Boolean(errors.sendOn)} className="w-auto" />
          </Field>
        ) : null}
        <Button type="submit" variant="secondary" disabled={!enabled || pending || !to.trim()}>
          {pending ? "One moment…" : when === "now" ? "Send now" : `Schedule for ${sendOn ? longDate(sendOn) : "that day"}`}
        </Button>
      </form>

      {notice ? (
        <Notice tone={notice.tone} className="mt-3">
          {notice.text}
        </Notice>
      ) : null}

      {history.length ? (
        <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-text-muted" aria-label="Email history">
          {history.map((d) => (
            <li key={d.id}>
              {d.status === "sent" ? `Sent to ${d.to}${d.sentAt ? `, ${shortDateTime(d.sentAt)}` : ""}.` : `Not sent on ${longDate(d.sendOn)}: ${d.lastError ?? "it couldn't be delivered."}`}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
