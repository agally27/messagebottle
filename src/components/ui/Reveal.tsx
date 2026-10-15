"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Fades content up once it scrolls into view. Pure CSS transition driven by
 * one IntersectionObserver; content is always visible without JS or with
 * reduced motion.
 */
export function Reveal({ as: Tag = "div", children, className, delay = 0 }: { as?: ElementType; children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Anything already at or above the viewport when we mount (e.g. the user
    // scrolled before hydration finished) is shown straight away.
    if (!("IntersectionObserver" in window) || el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add("reveal-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("reveal-in");
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    // Printing never scrolls: show everything.
    const onPrint = () => el.classList.add("reveal-in");
    window.addEventListener("beforeprint", onPrint);
    return () => {
      io.disconnect();
      window.removeEventListener("beforeprint", onPrint);
    };
  }, []);
  return (
    <Tag ref={ref} className={cn("reveal", className)} style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}>
      {children}
    </Tag>
  );
}
