"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { deleteGiftAction } from "@/lib/actions/gifts";

export function DeleteGiftButton({ giftId }: { giftId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!confirm) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
        Delete this gift
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-text-muted">This removes the story, scenes and link for good.</span>
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await deleteGiftAction(giftId);
            if (r && !r.ok) setError(r.error);
          })
        }
      >
        {pending ? "Deleting…" : "Delete permanently"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
        Cancel
      </Button>
      {error ? <Notice tone="danger">{error}</Notice> : null}
    </div>
  );
}
