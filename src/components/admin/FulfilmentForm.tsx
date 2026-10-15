"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { updateFulfilmentAction } from "@/lib/actions/orders";
import type { Fulfilment, OrderStatus } from "@/lib/domain/types";

const STATUSES: Fulfilment["status"][] = ["awaiting", "printing", "packed", "dispatched", "delivered"];

export function FulfilmentForm({ orderId, fulfilment, orderStatus }: { orderId: string; fulfilment: Fulfilment; orderStatus: OrderStatus }) {
  const router = useRouter();
  const [form, setForm] = useState({ status: fulfilment.status, notes: fulfilment.notes, carrier: fulfilment.carrier, trackingNumber: fulfilment.trackingNumber });
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const locked = orderStatus === "pending" || orderStatus === "cancelled" || orderStatus === "refunded";
  return (
    <div className="space-y-4">
      {locked ? <Notice tone="warning">This order isn&apos;t paid, so it can&apos;t be fulfilled.</Notice> : null}
      <Field id="f-status" label="Status">
        <Select id="f-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Fulfilment["status"] })} disabled={locked}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="f-carrier" label="Carrier" optional>
          <Input id="f-carrier" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} disabled={locked} maxLength={60} />
        </Field>
        <Field id="f-tracking" label="Tracking number" optional>
          <Input id="f-tracking" value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} disabled={locked} maxLength={80} />
        </Field>
      </div>
      <Field id="f-notes" label="Internal notes" optional>
        <Textarea id="f-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} disabled={locked} maxLength={1000} className="min-h-[5rem]" />
      </Field>
      <div className="flex items-center gap-3">
        <Button disabled={pending || locked} onClick={() => startTransition(async () => { const r = await updateFulfilmentAction(orderId, form); setMsg(r.ok ? { tone: "success", text: "Saved." } : { tone: "danger", text: r.error }); if (r.ok) router.refresh(); })}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {msg ? <Notice tone={msg.tone} className="py-1.5">{msg.text}</Notice> : null}
      </div>
      <p className="text-xs text-text-faint">Dispatch and delivery timestamps are recorded automatically. No supplier is contacted automatically.</p>
    </div>
  );
}
