"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { magicLinkAction } from "@/lib/actions/auth";

export function MagicLinkForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(magicLinkAction, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field id="email" label="Email address">
        <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
      </Field>
      {state ? <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice> : null}
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
