import type { GiftInput } from "@/lib/domain/types";

export const DRAFT_KEY = "mib:draft:v1";

export interface WizardDraft {
  input: GiftInput;
  step: number;
  productId: string | null;
  savedAt: string;
}

export const DEFAULT_INPUT: GiftInput = {
  occasion: "love",
  customOccasion: "",
  recipientName: "",
  relationship: "",
  pronouns: "unspecified",
  ageRange: "unspecified",
  recipientContext: "",
  senderName: "",
  message: "",
  memories: "",
  datesAndPlaces: "",
  tone: "romantic",
  transformation: "story",
  theme: "ocean",
  music: "piano",
  narration: false,
};

export function loadDraft(): WizardDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WizardDraft>;
    if (!parsed || typeof parsed !== "object" || !parsed.input) return null;
    return {
      input: { ...DEFAULT_INPUT, ...parsed.input },
      step: typeof parsed.step === "number" ? parsed.step : 0,
      productId: typeof parsed.productId === "string" ? parsed.productId : null,
      savedAt: parsed.savedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Omit<WizardDraft, "savedAt">): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
  } catch {
    /* storage unavailable (private mode, quota) — the wizard still works in memory */
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
