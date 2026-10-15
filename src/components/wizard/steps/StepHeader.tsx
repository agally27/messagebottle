export function StepHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <header>
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="step-heading" className="mt-2 text-3xl sm:text-4xl">
        {title}
      </h1>
      {intro ? <p className="mt-3 max-w-xl text-text-muted">{intro}</p> : null}
    </header>
  );
}
