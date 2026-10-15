import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

/** Slim chrome for signed-in / task pages (wizard, gifts, dashboard, checkout). */
export function AppShell({ children, right, narrow, className }: { children: ReactNode; right?: ReactNode; narrow?: boolean; className?: string }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-text-on-dark">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 glass border-b border-line">
        <div className="container-page flex h-14 items-center justify-between gap-3">
          <Logo compact />
          <div className="flex items-center gap-2">
            {right ?? (
              <Button href="/dashboard" variant="ghost" size="sm">
                My gifts
              </Button>
            )}
          </div>
        </div>
      </header>
      <main id="main" className={cn("flex-1 py-8 sm:py-12", narrow ? "container-narrow" : "container-page", className)}>
        {children}
      </main>
    </>
  );
}
