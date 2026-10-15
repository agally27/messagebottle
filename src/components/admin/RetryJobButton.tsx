"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminRetryGiftAction } from "@/lib/actions/admin";

export function RetryJobButton({ giftId }: { giftId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await adminRetryGiftAction(giftId);
            setMsg(r.ok ? "Requeued" : r.error);
            router.refresh();
          })
        }
        className="rounded-full border border-line-strong px-3 py-1 text-xs font-semibold text-ink hover:border-ink/50 disabled:opacity-50"
      >
        {pending ? "…" : "Retry"}
      </button>
      {msg ? <span className="text-xs text-text-muted">{msg}</span> : null}
    </span>
  );
}
