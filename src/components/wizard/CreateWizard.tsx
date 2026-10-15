"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Steps } from "@/components/ui/Steps";
import { Notice } from "@/components/ui/Notice";
import { createGiftAction } from "@/lib/actions/gifts";
import { stepSchemas, formatIssues } from "@/lib/domain/schemas";
import { OCCASION_IDS, getOccasion } from "@/lib/domain/occasions";
import { THEME_IDS } from "@/lib/domain/themes";
import { isCarol } from "@/lib/domain/music";
import type { GiftInput, OccasionId, ThemeId } from "@/lib/domain/types";
import { clearDraft, DEFAULT_INPUT, loadDraft, saveDraft } from "./draft";
import { OccasionStep } from "./steps/OccasionStep";
import { RecipientStep } from "./steps/RecipientStep";
import { MessageStep } from "./steps/MessageStep";
import { StyleStep } from "./steps/StyleStep";
import { SoundStep } from "./steps/SoundStep";
import { ReviewStep } from "./steps/ReviewStep";

export const WIZARD_STEPS = [
  { id: "occasion", label: "Occasion" },
  { id: "recipient", label: "Who it's for" },
  { id: "message", label: "Your message" },
  { id: "style", label: "Look" },
  { id: "sound", label: "Sound" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof WIZARD_STEPS)[number]["id"];

export type FieldErrors = Record<string, string>;

export interface StepProps {
  input: GiftInput;
  update: (patch: Partial<GiftInput>) => void;
  errors: FieldErrors;
}

export function CreateWizard({ demoMode, signedIn, requiresSignIn }: { demoMode: boolean; signedIn: boolean; requiresSignIn: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const initial = useMemo(() => {
    const saved = loadDraft();
    const occasionParam = params.get("occasion");
    const productParam = params.get("product");
    const input: GiftInput = saved?.input ? { ...saved.input } : { ...DEFAULT_INPUT };
    if (occasionParam && (OCCASION_IDS as readonly string[]).includes(occasionParam)) {
      input.occasion = occasionParam as OccasionId;
      const occ = getOccasion(input.occasion);
      input.tone = occ.defaultTone;
      input.theme = occ.suggestedThemes[0] ?? input.theme;
      if (occ.defaultMusic) input.music = occ.defaultMusic;
      else if (isCarol(input.music)) input.music = "piano";
    }
    const themeParam = params.get("theme");
    if (themeParam && (THEME_IDS as readonly string[]).includes(themeParam)) input.theme = themeParam as ThemeId;
    return { input, step: saved?.step ?? 0, productId: productParam ?? saved?.productId ?? null, resumed: Boolean(saved?.input?.message) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [input, setInput] = useState<GiftInput>(initial.input);
  const [step, setStep] = useState<number>(Math.min(initial.step, WIZARD_STEPS.length - 1));
  const [maxReached, setMaxReached] = useState<number>(initial.step);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(initial.resumed);
  const [pending, startTransition] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);

  // Persist the draft (debounced) whenever it changes.
  useEffect(() => {
    const t = setTimeout(() => saveDraft({ input, step, productId: initial.productId }), 250);
    return () => clearTimeout(t);
  }, [input, step, initial.productId]);

  const update = useCallback((patch: Partial<GiftInput>) => {
    setInput((prev) => {
      const next = { ...prev, ...patch };
      // Sensible defaults follow the occasion until the sender changes them.
      if (patch.occasion && patch.occasion !== prev.occasion) {
        const occ = getOccasion(patch.occasion);
        next.tone = occ.defaultTone;
        next.theme = occ.suggestedThemes[0] ?? prev.theme;
        if (occ.defaultMusic) next.music = occ.defaultMusic;
        else if (isCarol(next.music)) next.music = "piano";
        if (patch.occasion === "remembrance" && (next.music === "celebratory")) next.music = "peaceful";
      }
      return next;
    });
    setErrors((prev) => {
      const keys = Object.keys(patch);
      if (!keys.some((k) => prev[k])) return prev;
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  }, []);

  const validateStep = useCallback(
    (index: number): boolean => {
      const id = WIZARD_STEPS[index]!.id as StepId;
      if (id === "review") return true;
      const schema = stepSchemas[id];
      const result = schema.safeParse(input);
      if (result.success) {
        setErrors({});
        return true;
      }
      setErrors(formatIssues(result.error));
      return false;
    },
    [input],
  );

  const goTo = useCallback((index: number) => {
    setStep(index);
    setFormError(null);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  const next = () => {
    if (!validateStep(step)) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    const n = Math.min(step + 1, WIZARD_STEPS.length - 1);
    setMaxReached((m) => Math.max(m, n));
    goTo(n);
  };

  const back = () => goTo(Math.max(0, step - 1));

  const submit = () => {
    // Validate everything once more before spending anything.
    for (let i = 0; i < WIZARD_STEPS.length - 1; i++) {
      const id = WIZARD_STEPS[i]!.id as StepId;
      if (id === "review") continue;
      const r = stepSchemas[id].safeParse(input);
      if (!r.success) {
        setErrors(formatIssues(r.error));
        goTo(i);
        return;
      }
    }
    setFormError(null);
    if (requiresSignIn) {
      // Real accounts: keep the draft (already in localStorage, at this step) and come back here after signing in.
      saveDraft({ input, step, productId: initial.productId });
      router.push(`/login?next=${encodeURIComponent("/create")}`);
      return;
    }
    startTransition(async () => {
      const result = await createGiftAction(input, { productId: initial.productId });
      // On success the action redirects and never returns here.
      if (result && !result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
      } else {
        clearDraft();
      }
    });
  };

  const stepId = WIZARD_STEPS[step]!.id as StepId;
  const stepProps: StepProps = { input, update, errors };

  return (
    <div ref={topRef} className="scroll-mt-24">
      <div className="mb-8">
        <Steps steps={[...WIZARD_STEPS]} current={step} maxReachable={maxReached} onSelect={(i) => (i <= step || validateStep(step)) && goTo(i)} />
      </div>

      {resumed && step > 0 ? (
        <Notice tone="info" className="mb-6">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span>We&apos;ve picked up where you left off.</span>
            <button
              type="button"
              className="font-semibold text-ocean underline-offset-4 hover:underline"
              onClick={() => {
                clearDraft();
                setInput({ ...DEFAULT_INPUT });
                setStep(0);
                setMaxReached(0);
                setResumed(false);
              }}
            >
              Start again
            </button>
          </span>
        </Notice>
      ) : null}

      <section aria-labelledby="step-heading" className="animate-fade-in pb-24 sm:pb-0" key={stepId}>
        {stepId === "occasion" ? <OccasionStep {...stepProps} /> : null}
        {stepId === "recipient" ? <RecipientStep {...stepProps} /> : null}
        {stepId === "message" ? <MessageStep {...stepProps} /> : null}
        {stepId === "style" ? <StyleStep {...stepProps} /> : null}
        {stepId === "sound" ? <SoundStep {...stepProps} /> : null}
        {stepId === "review" ? <ReviewStep {...stepProps} goTo={goTo} demoMode={demoMode} signedIn={signedIn} productId={initial.productId} /> : null}
      </section>

      {formError ? (
        <Notice tone="danger" className="mt-6">
          {formError}
        </Notice>
      ) : null}

      <div className="sticky bottom-0 -mx-5 mt-10 border-t border-line bg-cream/95 px-5 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 0 || pending}>
            Back
          </Button>
          {stepId === "review" ? (
            <Button type="button" size="lg" onClick={submit} disabled={pending}>
              {pending ? "Starting…" : requiresSignIn ? "Sign in to create my gift" : "Create my gift"}
            </Button>
          ) : (
            <Button type="button" size="lg" onClick={next}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
