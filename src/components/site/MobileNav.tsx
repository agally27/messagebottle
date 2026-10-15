"use client";

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function MobileNav({ links }: { links: Array<{ href: string; label: string }> }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    // Close the menu when navigation happens (state derived during render).
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-ink/5"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open ? (
        <div id={id} className="absolute inset-x-0 top-16 border-b border-line bg-paper shadow-lift">
          <nav aria-label="Mobile" className="container-page flex flex-col py-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-3 text-base font-medium text-ink hover:bg-ink/5">
                {l.label}
              </a>
            ))}
            <a href="/dashboard" className="rounded-md px-2 py-3 text-base font-medium text-ink hover:bg-ink/5">
              My gifts
            </a>
            <div className="px-2 pb-3 pt-2">
              <Button href="/create" fullWidth size="lg">
                Create your gift
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
