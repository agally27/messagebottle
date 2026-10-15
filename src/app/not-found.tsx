import { Button } from "@/components/ui/Button";
import { BottleMark } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center paper-texture px-6 py-24 text-center">
      <div className="max-w-md">
        <BottleMark className="mx-auto h-12 text-ocean" />
        <h1 className="mt-6 text-3xl">This one drifted away.</h1>
        <p className="mt-3 text-text-muted">We couldn&apos;t find that page. If you followed a gift link, it may have been revoked, or the address may be incomplete.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/">Back to shore</Button>
          <Button href="/support" variant="secondary">Get help</Button>
        </div>
      </div>
    </main>
  );
}
