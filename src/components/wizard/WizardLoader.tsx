"use client";

import dynamic from "next/dynamic";

/**
 * The wizard restores its draft from localStorage, so it renders on the
 * client only; this avoids a hydration mismatch and a flash of empty fields.
 */
const CreateWizard = dynamic(() => import("./CreateWizard").then((m) => m.CreateWizard), {
  ssr: false,
  loading: () => (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div className="h-8 w-2/3 skeleton rounded-md" />
      <div className="h-24 skeleton rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 skeleton rounded-lg" />
        ))}
      </div>
    </div>
  ),
});

export function WizardLoader(props: { demoMode: boolean; signedIn: boolean; requiresSignIn: boolean }) {
  return <CreateWizard {...props} />;
}
