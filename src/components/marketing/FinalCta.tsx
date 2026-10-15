import { Button } from "@/components/ui/Button";

export function FinalCta() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container-narrow text-center">
        <p className="eyebrow">Begin</p>
        <h2 className="mt-3 text-3xl sm:text-5xl">Say the thing you&apos;ve been meaning to say.</h2>
        <p className="mx-auto mt-4 max-w-md text-text-muted">It takes about ten minutes. You can save a draft and come back.</p>
        <div className="mt-8 flex justify-center">
          <Button href="/create" size="lg">
            Create your gift
          </Button>
        </div>
      </div>
    </section>
  );
}
