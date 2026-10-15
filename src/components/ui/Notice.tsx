import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "info" | "success" | "warning" | "danger" | "demo";

const tones: Record<Tone, string> = {
  info: "bg-mist border-seaglass text-ink",
  success: "bg-success-pale border-success/30 text-[#1f5c45]",
  warning: "bg-warning-pale border-warning/30 text-[#6b4a16]",
  danger: "bg-danger-pale border-danger/30 text-[#7a2e29]",
  demo: "bg-gold-pale border-gold/50 text-[#5b4717]",
};

export function Notice({ tone = "info", title, children, className, role }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string; role?: "status" | "alert" }) {
  return (
    <div role={role ?? (tone === "danger" ? "alert" : "status")} className={cn("rounded-md border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cn(title ? "mt-0.5" : null)}>{children}</div> : null}
    </div>
  );
}
