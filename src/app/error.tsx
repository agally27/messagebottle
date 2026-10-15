"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep logs free of message content; the digest identifies the server log line.
    console.error("[app] unhandled error", error.digest ?? error.message);
  }, [error]);
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24 text-center">
      <div className="max-w-md">
        <h1 className="text-3xl">Something went wrong.</h1>
        <p className="mt-3 text-text-muted">Your work is safe. Try again, and if it keeps happening, let us know.</p>
        {error.digest ? <p className="mt-2 text-xs text-text-faint">Reference {error.digest}</p> : null}
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button href="/support" variant="secondary">Contact support</Button>
        </div>
      </div>
    </main>
  );
}
