import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface FieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
  className?: string;
  /** Counter text, e.g. "120 / 400". */
  counter?: string;
}

export function Field({ id, label, hint, error, optional, children, className, counter }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
          {optional ? <span className="ml-1.5 font-normal text-text-faint">(optional)</span> : null}
        </label>
        {counter ? (
          <span className="text-xs tabular-nums text-text-faint" aria-hidden>
            {counter}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full rounded-md border bg-white/70 px-4 text-[0.98rem] text-text placeholder:text-text-faint transition-[border-color,box-shadow] duration-150 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ocean/40 focus:border-ocean disabled:opacity-60";

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      className={cn(controlBase, "h-12", invalid ? "border-danger" : "border-line-strong", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(controlBase, "py-3 leading-relaxed min-h-[8rem] resize-y", invalid ? "border-danger" : "border-line-strong", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({ className, invalid, children, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select
      className={cn(controlBase, "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235b6578%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><path d=%27m6 9 6 6 6-6%27/></svg>')] bg-no-repeat bg-[right_0.9rem_center] pr-10", invalid ? "border-danger" : "border-line-strong", className)}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}
