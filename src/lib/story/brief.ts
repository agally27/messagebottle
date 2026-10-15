import { getOccasion } from "@/lib/domain/occasions";
import { getTheme } from "@/lib/domain/themes";
import { getTone } from "@/lib/domain/tones";
import type { GiftInput } from "@/lib/domain/types";
import { hashString } from "@/lib/utils/random";

/**
 * A structured, validated description of what the story must contain. Both
 * the local writer and model-backed providers work from this, so the facts the
 * story may use are exactly the facts the sender supplied.
 */
export interface ContentBrief {
  recipientName: string;
  senderName: string;
  /** "my wife", "my best friend" — always sender-voice, prefixed with "my". */
  relationshipPhrase: string;
  relationshipRaw: string;
  occasionId: GiftInput["occasion"];
  occasionLabel: string;
  sensitive: boolean;
  tone: GiftInput["tone"];
  toneLabel: string;
  transformation: GiftInput["transformation"];
  pronouns: GiftInput["pronouns"];
  ageRange: GiftInput["ageRange"];
  context: string;
  /** The sender's message, exactly as written, with whitespace normalised. */
  message: string;
  /** Paragraphs of the message. */
  paragraphs: string[];
  /** Sentences of the message in order. */
  sentences: string[];
  memories: string;
  memorySentences: string[];
  datesAndPlaces: string;
  themeId: GiftInput["theme"];
  artDirection: string;
  /** Stable seed derived from the inputs, used for deterministic variety. */
  seed: number;
}

export function splitSentences(text: string): string[] {
  const normalised = text.replace(/\s+/g, " ").trim();
  if (!normalised) return [];
  const parts = normalised.split(/(?<=[.!?…])\s+(?=[^a-z])/u).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [normalised];
}

export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}|\n(?=\s*[-•])/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

export function relationshipPhrase(raw: string): string {
  let r = raw.trim().replace(/\s+/g, " ");
  if (!r) return "";
  r = r.replace(/^(my|our|the)\s+/i, "");
  r = r.replace(/[.!]+$/, "");
  return `my ${r.charAt(0).toLowerCase()}${r.slice(1)}`;
}

export function buildBrief(input: GiftInput): ContentBrief {
  const occasion = getOccasion(input.occasion);
  const tone = getTone(input.tone);
  const theme = getTheme(input.theme);
  const paragraphs = splitParagraphs(input.message);
  const sentences = paragraphs.flatMap(splitSentences);
  const memorySentences = splitParagraphs(input.memories).flatMap(splitSentences);
  const occasionLabel = input.occasion === "other" && input.customOccasion ? input.customOccasion.trim() : occasion.label;
  return {
    recipientName: input.recipientName.trim(),
    senderName: input.senderName.trim(),
    relationshipPhrase: relationshipPhrase(input.relationship),
    relationshipRaw: input.relationship.trim(),
    occasionId: input.occasion,
    occasionLabel,
    sensitive: Boolean(occasion.sensitive),
    tone: input.tone,
    toneLabel: tone.label,
    transformation: input.transformation,
    pronouns: input.pronouns,
    ageRange: input.ageRange,
    context: input.recipientContext.trim(),
    message: paragraphs.join("\n\n"),
    paragraphs,
    sentences,
    memories: input.memories.trim(),
    memorySentences,
    datesAndPlaces: input.datesAndPlaces.trim(),
    themeId: input.theme,
    artDirection: theme.artDirection,
    seed: hashString(`${input.recipientName}|${input.senderName}|${input.message}|${input.occasion}|${input.tone}`),
  };
}
