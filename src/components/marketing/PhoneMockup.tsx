import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** A phone frame for showing the recipient experience. Children fill the screen. */
export function PhoneMockup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative aspect-[9/19] w-[220px] rounded-[16%/8%] bg-[#0f1322] p-[3%] shadow-lift ring-1 ring-black/40", className)} aria-hidden>
      <div className="absolute left-1/2 top-[4.5%] z-10 h-[3.6%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
      <div className="relative h-full w-full overflow-hidden rounded-[13%/6.5%] bg-ink">{children}</div>
    </div>
  );
}
