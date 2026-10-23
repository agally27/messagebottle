import type { ContentBrief } from "./brief";
import type { StoryDraft } from "@/lib/providers/types";

export interface QualityReport {
  ok: boolean;
  /** Fraction of the sender's sentences that appear verbatim in the story. */
  coverage: number;
  issues: string[];
}

const normalise = (s: string) => s.toLowerCase().replace(/[\s"'“”‘’]+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();

/**
 * Checks a draft against the sender's brief. Used to reject model output that
 * drifts from the sender's meaning, and to annotate local output.
 */
export function checkStory(brief: ContentBrief, draft: StoryDraft): QualityReport {
  const issues: string[] = [];
  const all = normalise([draft.opening, ...draft.scenes.map((s) => `${s.heading} ${s.text}`), draft.closing, draft.dedication].join(" "));

  if (!all.includes(normalise(brief.recipientName))) issues.push("recipient name missing");
  if (!all.includes(normalise(brief.senderName))) issues.push("sender name missing");

  const sentences = brief.sentences.map(normalise).filter((s) => s.length > 3);
  // Headings sit between scenes, so also read the story text continuously: a short
  // sentence may be split across two scenes at a natural pause.
  const flowing = normalise([...draft.scenes.map((s) => s.text), draft.closing].join(" "));
  const present = sentences.filter((s) => all.includes(s) || flowing.includes(s)).length;
  const coverage = sentences.length ? present / sentences.length : 1;
  const required = brief.transformation === "close" ? 0.95 : brief.transformation === "story" ? 0.6 : 0.5;
  if (coverage < required) issues.push(`only ${(coverage * 100).toFixed(0)}% of the sender's sentences were kept (need ${required * 100}%)`);

  if (draft.scenes.some((s) => !s.text.trim())) issues.push("empty scene");
  if (draft.scenes.length < 2) issues.push("too few scenes");
  const words = all.split(" ").length;
  if (words > 1400) issues.push("story too long");

  if (brief.sensitive) {
    const banned = /\b(congratulations|celebrate|party|happy birthday|cheers)\b/i;
    const raw = [draft.opening, ...draft.scenes.map((s) => s.text), draft.closing].join(" ");
    if (banned.test(raw) && !banned.test(brief.message)) issues.push("celebratory language in a remembrance gift");
  }

  return { ok: issues.length === 0, coverage, issues };
}
