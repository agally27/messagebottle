"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Spinner } from "@/components/ui/Spinner";
import { retryGenerationAction } from "@/lib/actions/gifts";
import { JOB_STEPS, type JobStep } from "@/lib/domain/types";
import type { GenerationStatus } from "@/lib/gifts/service";
import { cn } from "@/lib/utils/cn";

const STAGES: Array<{ id: string; label: string; steps: JobStep[] }> = [
  { id: "story", label: "Preparing the personal story", steps: ["brief", "story"] },
  { id: "scenes", label: "Creating the illustrated scenes", steps: ["scenes", "images"] },
  { id: "audio", label: "Preparing the soundtrack", steps: ["audio"] },
  { id: "assemble", label: "Assembling the experience", steps: ["assemble"] },
];

export function GenerationProgress({ giftId, initial }: { giftId: string; initial: GenerationStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<GenerationStatus>(initial);
  const [pending, startTransition] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const failures = useRef(0);

  const done = status.giftStatus === "ready" || status.giftStatus === "active";
  const failed = status.giftStatus === "failed" || status.job?.status === "failed";

  useEffect(() => {
    if (done || failed) return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const res = await fetch(`/api/gifts/${giftId}/job`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as GenerationStatus;
        if (cancelled) return;
        failures.current = 0;
        setOffline(false);
        setStatus(data);
      } catch {
        failures.current += 1;
        if (failures.current >= 3) setOffline(true);
      }
      if (!cancelled) timer = window.setTimeout(poll, failures.current ? 3000 : 1200);
    };
    timer = window.setTimeout(poll, 800);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [giftId, done, failed]);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => router.replace(`/gifts/${giftId}`), 900);
    return () => window.clearTimeout(t);
  }, [done, giftId, router]);

  const completed = new Set(status.job?.completedSteps ?? []);
  const currentStep = status.job?.step;
  const currentIndex = currentStep ? JOB_STEPS.indexOf(currentStep) : -1;

  const retry = () => {
    setRetryError(null);
    startTransition(async () => {
      const r = await retryGenerationAction(giftId);
      if (!r.ok) setRetryError(r.error);
      else {
        failures.current = 0;
        setStatus((s) => ({ ...s, giftStatus: "generating", job: s.job ? { ...s.job, status: "queued", lastError: null } : s.job }));
      }
    });
  };

  return (
    <div className="mx-auto max-w-lg">
      <ol className="space-y-3" aria-label="Generation progress">
        {STAGES.map((stage) => {
          const stageDone = stage.steps.every((s) => completed.has(s)) || done;
          const active = !stageDone && !failed && stage.steps.some((s) => JOB_STEPS.indexOf(s) === currentIndex);
          const stageFailed = failed && stage.steps.some((s) => s === currentStep) && !stageDone;
          return (
            <li key={stage.id} className={cn("flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors", stageDone ? "border-success/30 bg-success-pale/40" : active ? "border-ink bg-paper shadow-soft" : stageFailed ? "border-danger/40 bg-danger-pale/50" : "border-line bg-paper/60 text-text-faint")}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                {stageDone ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success text-white">
                    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m5 10.5 3.2 3L15 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                ) : active ? (
                  <Spinner className="text-ink" label="Working" />
                ) : stageFailed ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white text-sm font-bold">!</span>
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                )}
              </span>
              <span className={cn("font-medium", stageDone ? "text-ink" : active ? "text-ink" : undefined)}>{stage.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 space-y-3" aria-live="polite">
        {done ? <Notice tone="success">Your gift is ready. Taking you to the preview…</Notice> : null}
        {!done && !failed && status.job?.status === "queued" && status.job.attempts > 0 ? (
          <Notice tone="warning">A step didn&apos;t complete the first time. We&apos;re retrying automatically (attempt {status.job.attempts + 1}).</Notice>
        ) : null}
        {failed ? (
          <Notice tone="danger" title="We couldn't finish your gift">
            {status.job?.lastError?.permanent ? "A service we rely on refused the request." : "Something kept failing along the way."} Nothing you wrote has been lost. {status.job?.lastError?.message ? <span className="block mt-1 text-xs opacity-80">Detail: {status.job.lastError.message}</span> : null}
          </Notice>
        ) : null}
        {offline ? <Notice tone="warning">We&apos;re having trouble checking progress. Your gift is still being made — this page will catch up.</Notice> : null}
        {status.job?.mode === "demo" && !done && !failed ? (
          <Notice tone="demo">Demo generation: no AI service is connected. The story is composed on this server from your exact words; the pacing is simulated so you can see each stage.</Notice>
        ) : null}
        {retryError ? <Notice tone="danger">{retryError}</Notice> : null}
      </div>

      {failed ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={retry} disabled={pending}>
            {pending ? "Retrying…" : "Try again"}
          </Button>
          <Button href="/create" variant="secondary">
            Edit my message
          </Button>
          <Button href="/support" variant="ghost">
            Get help
          </Button>
        </div>
      ) : null}
    </div>
  );
}
