import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/site/AppShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { demoSignInAction } from "@/lib/actions/auth";
import { demoAuthEnabled, getCurrentUser } from "@/lib/auth/session";
import { MagicLinkForm } from "./MagicLinkForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/dashboard";
  const user = await getCurrentUser();
  if (user) redirect(next);
  const demo = demoAuthEnabled();
  return (
    <AppShell narrow className="max-w-md" right={<span />}>
      <p className="eyebrow">Sign in</p>
      <h1 className="mt-2 text-3xl">Welcome back</h1>
      {demo ? (
        <>
          <p className="mt-3 text-text-muted">This environment runs without an account service, so you can continue as a guest. Your gifts are tied to this browser.</p>
          <Notice tone="demo" className="mt-5">Demo sign-in. Connect Supabase Auth for real email sign-in (see docs/DEPLOYMENT.md).</Notice>
          <form action={demoSignInAction} className="mt-6 space-y-5">
            <input type="hidden" name="next" value={next} />
            <Field id="name" label="Your name">
              <Input id="name" name="name" placeholder="Tom" maxLength={40} autoComplete="given-name" required />
            </Field>
            <Button type="submit" size="lg" fullWidth>
              Continue as guest
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-3 text-text-muted">We&apos;ll email you a sign-in link. No password to remember.</p>
          <div className="mt-6">
            <MagicLinkForm next={next} />
          </div>
        </>
      )}
    </AppShell>
  );
}
