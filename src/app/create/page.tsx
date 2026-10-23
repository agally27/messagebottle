import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/site/AppShell";
import { WizardLoader } from "@/components/wizard/WizardLoader";
import { demoAuthEnabled, getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/config/env";
import { listProducts } from "@/lib/config/catalogue";

export const metadata: Metadata = { title: "Create your gift", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const user = await getCurrentUser();
  return (
    <AppShell narrow className="max-w-3xl">
      <Suspense fallback={null}>
        <WizardLoader demoMode={env.demoMode || env.storyProvider === "local"} signedIn={Boolean(user)} requiresSignIn={!user && !demoAuthEnabled()} products={listProducts()} />
      </Suspense>
    </AppShell>
  );
}
