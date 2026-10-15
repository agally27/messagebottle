import { cn } from "@/lib/utils/cn";

export interface StepDef {
  id: string;
  label: string;
}

export function Steps({ steps, current, onSelect, maxReachable }: { steps: StepDef[]; current: number; onSelect?: (index: number) => void; maxReachable?: number }) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((step, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          const reachable = onSelect && (maxReachable === undefined ? i <= current : i <= maxReachable);
          const inner = (
            <>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  state === "done" && "bg-teal text-white",
                  state === "current" && "bg-ink text-text-on-dark",
                  state === "todo" && "bg-sand text-text-faint",
                )}
                aria-hidden
              >
                {state === "done" ? (
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m5 10.5 3.2 3L15 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="sr-only">Step {i + 1}{state === "done" ? " (completed)" : state === "current" ? " (current)" : ""}: </span>
              <span className={cn("sr-only text-sm sm:not-sr-only", state === "current" ? "font-semibold text-ink" : "text-text-muted")}>{step.label}</span>
            </>
          );
          return (
            <li key={step.id} className={cn("flex items-center gap-2 sm:gap-3", i < steps.length - 1 && "flex-1")}>
              {reachable ? (
                <button type="button" onClick={() => onSelect?.(i)} className="flex items-center gap-2 rounded-full" aria-current={state === "current" ? "step" : undefined}>
                  {inner}
                </button>
              ) : (
                <span className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
                  {inner}
                </span>
              )}
              {i < steps.length - 1 ? <span className={cn("h-px flex-1 min-w-3", i < current ? "bg-teal" : "bg-line-strong")} aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
