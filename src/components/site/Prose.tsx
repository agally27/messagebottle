import type { ReactNode } from "react";

export function ProsePage({ eyebrow, title, intro, children, updated }: { eyebrow: string; title: string; intro?: string; children: ReactNode; updated?: string }) {
  return (
    <article className="container-narrow py-14 sm:py-20">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">{title}</h1>
      {intro ? <p className="mt-4 text-lg text-text-muted">{intro}</p> : null}
      {updated ? <p className="mt-2 text-xs text-text-faint">Last updated {updated}</p> : null}
      <div className="prose-custom mt-10 space-y-6 text-[1rem] leading-relaxed text-text [&_h2]:mt-10 [&_h2]:text-2xl [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_a]:font-semibold [&_a]:text-ocean [&_a]:underline-offset-4 hover:[&_a]:underline">
        {children}
      </div>
    </article>
  );
}
