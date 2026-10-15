import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("rounded-xl bg-paper border border-line shadow-card", className)} {...props} />;
}

export function CardBody({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}
