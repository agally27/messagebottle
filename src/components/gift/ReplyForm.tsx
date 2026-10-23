"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils/cn";

const REPLY_MAX = 1000;

/**
 * Lets the recipient write a short private reply to the sender from the end
 * of the gift. In the sender's preview it is shown but can't be sent.
 */
export function ReplyForm({ token, senderName, dark, accent, preview }: { token: string; senderName: string; dark: boolean; accent: string; preview?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const muted = dark ? "text-text-on-dark-muted" : "text-text-muted";
  const outline = dark ? "border-white/30 text-text-on-dark hover:bg-white/10" : "border-ink/30 text-ink hover:bg-ink/5";

  if (state === "sent") {
    return (
      <p role="status" className={cn("mt-6 text-sm", muted)}>
        Sent. Only {senderName} will see it.
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn("inline-flex h-12 items-center rounded-full border px-6 text-sm font-semibold", outline)}>
        Write back to {senderName}
      </button>
    );
  }

  const send = async () => {
    setError(null);
    if (preview) return;
    if (!message.trim()) {
      setError("Write a few words first.");
      return;
    }
    setState("sending");
    try {
      const res = await fetch(`/api/g/${token}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      if (res.ok) {
        setState("sent");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Something went wrong sending that. Please try again.");
    } catch {
      setError("Couldn't send just now. Check your connection and try again.");
    }
    setState("idle");
  };

  return (
    <form
      className="mt-6 w-full text-left"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <label htmlFor={id} className="text-sm font-semibold">
        Your reply to {senderName}
      </label>
      <textarea
        id={id}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={REPLY_MAX}
        rows={4}
        autoFocus
        placeholder="Thank you for…"
        aria-describedby={`${id}-help`}
        className={cn("mt-2 w-full rounded-xl border px-4 py-3 text-[1rem] leading-relaxed outline-none focus-visible:ring-2", dark ? "border-white/25 bg-black/30 text-text-on-dark placeholder:text-text-on-dark-muted" : "border-ink/20 bg-white/80 text-ink placeholder:text-text-faint")}
        style={{ ["--tw-ring-color" as string]: accent }}
      />
      <p id={`${id}-help`} className={cn("mt-1 flex justify-between gap-3 text-xs", muted)}>
        <span>{preview ? "This is a preview, so nothing is sent." : `Only ${senderName} will see it.`}</span>
        <span>
          {message.length} / {REPLY_MAX}
        </span>
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm" style={{ color: dark ? "#ffb4a8" : "#a2342c" }}>
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state === "sending" || preview} className={cn("inline-flex h-12 items-center rounded-full px-6 text-sm font-semibold shadow-soft disabled:opacity-50", dark ? "bg-paper text-ink" : "bg-ink text-text-on-dark")}>
          {state === "sending" ? "Sending…" : "Send reply"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={cn("text-sm font-semibold underline-offset-4 hover:underline", muted)}>
          Not now
        </button>
      </div>
    </form>
  );
}
