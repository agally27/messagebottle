import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A card that behaves as a radio option (native input, visually hidden) so it
 * is keyboard-accessible and announced correctly.
 */
export function OptionCard({ name, value, checked, onChange, title, description, media, className, compact, disabled }: { name: string; value: string; checked: boolean; onChange: (value: string) => void; title: ReactNode; description?: ReactNode; media?: ReactNode; className?: string; compact?: boolean; disabled?: boolean }) {
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-paper text-left transition-[border-color,box-shadow,transform] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ocean/50",
        checked ? "border-ink shadow-card ring-1 ring-ink" : "border-line hover:border-line-strong hover:shadow-soft",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="sr-only" disabled={disabled} />
      {media ? <div className="relative">{media}</div> : null}
      <span className={cn("flex flex-col", compact ? "px-3.5 py-3" : "px-4 py-3.5")}>
        <span className="flex items-center justify-between gap-2">
          <span className="font-semibold text-ink">{title}</span>
          <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors", checked ? "border-ink bg-ink text-text-on-dark" : "border-line-strong bg-white")} aria-hidden>
            {checked ? (
              <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="m5 10.5 3.2 3L15 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </span>
        </span>
        {description ? <span className="mt-1 text-sm leading-snug text-text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export function Chip({ selected, onClick, children, className }: { selected?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors",
        selected ? "border-ink bg-ink text-text-on-dark" : "border-line-strong bg-paper text-ink hover:border-ink/50",
        className,
      )}
    >
      {children}
    </button>
  );
}
