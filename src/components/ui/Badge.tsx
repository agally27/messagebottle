import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "gold" | "teal" | "success" | "warning" | "danger" | "ink";

const tones: Record<Tone, string> = {
  neutral: "bg-sand text-text-muted",
  gold: "bg-gold-pale text-[#6d5620]",
  teal: "bg-seaglass-pale text-teal-deep",
  success: "bg-success-pale text-success",
  warning: "bg-warning-pale text-warning",
  danger: "bg-danger-pale text-danger",
  ink: "bg-ink text-text-on-dark",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentPropsWithoutRef<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide", tones[tone], className)}
      {...props}
    />
  );
}
