import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "gold" | "danger" | "onDark";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,color,box-shadow,transform] duration-200 ease-out-soft select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.985] motion-reduce:active:scale-100 whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-text-on-dark hover:bg-navy shadow-soft",
  secondary: "bg-paper text-ink border border-line-strong hover:border-ink/40 hover:bg-white",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
  gold: "bg-gold text-ink hover:bg-[#d6b86f] shadow-soft",
  danger: "bg-danger-pale text-danger hover:bg-[#f3d1ce]",
  onDark: "bg-white/12 text-text-on-dark border border-white/25 hover:bg-white/20 backdrop-blur",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-13 px-7 text-base min-h-[3.25rem]",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
}

type ButtonProps = CommonProps & Omit<ComponentPropsWithoutRef<"button">, "className" | "children"> & { href?: undefined };
type LinkButtonProps = CommonProps & Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children"> & { href: string };

export function Button(props: ButtonProps | LinkButtonProps) {
  const { variant = "primary", size = "md", className, children, leading, trailing, fullWidth, ...rest } = props;
  const classes = cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
  if ("href" in rest && typeof rest.href === "string") {
    const { href, ...linkRest } = rest as LinkButtonProps;
    return (
      <Link href={href} className={classes} {...linkRest}>
        {leading}
        {children}
        {trailing}
      </Link>
    );
  }
  const { type = "button", ...buttonRest } = rest as ButtonProps;
  return (
    <button type={type} className={classes} {...buttonRest}>
      {leading}
      {children}
      {trailing}
    </button>
  );
}
