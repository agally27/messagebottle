import { cn } from "@/lib/utils/cn";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn("inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-pulse-soft", className)} />
  );
}
