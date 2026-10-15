import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** A simple bottle mark: a rounded vessel with a cork and a rolled note inside. */
export function BottleMark({ className, title = "Message in a Bottle" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 40" className={cn("h-8 w-auto", className)} role="img" aria-label={title} fill="none">
      <title>{title}</title>
      <path d="M12 3.5h8v3.2c0 .9.3 1.7.9 2.4 2.3 2.6 4.1 5.6 4.1 9.4V33a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 7 33V18.5c0-3.8 1.8-6.8 4.1-9.4.6-.7.9-1.5.9-2.4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12.5 1.8h7v2.4h-7z" fill="currentColor" opacity=".9" />
      <path d="M12 22.5c1.7-1.6 4.2-1.6 6 0s4.3 1.6 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
      <path d="M12 27c1.7-1.6 4.2-1.6 6 0s4.3 1.6 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".35" />
      <rect x="13.2" y="12.5" width="5.6" height="7" rx="1.2" transform="rotate(-18 16 16)" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("font-display text-ink leading-none tracking-tight", compact ? "text-lg" : "text-[1.35rem]", className)}>
      Message <span className="italic font-light">in a</span> Bottle
    </span>
  );
}

export function Logo({ className, href = "/", compact, onDark }: { className?: string; href?: string; compact?: boolean; onDark?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-md", onDark ? "text-text-on-dark" : "text-ink", className)} aria-label="Message in a Bottle — home">
      <BottleMark className={cn("h-8", onDark ? "text-text-on-dark" : "text-ocean")} />
      <Wordmark compact={compact} className={onDark ? "text-text-on-dark" : undefined} />
    </Link>
  );
}
