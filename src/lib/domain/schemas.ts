import { z } from "zod";
import { MUSIC_MOOD_IDS } from "./music";
import { OCCASION_IDS } from "./occasions";
import { THEME_IDS } from "./themes";
import { TONE_IDS } from "./tones";

const trimmed = (max: number) => z.string().trim().max(max);

export const LIMITS = {
  recipientName: 40,
  relationship: 60,
  customOccasion: 60,
  senderName: 40,
  recipientContext: 400,
  messageMin: 20,
  messageMax: 2500,
  memories: 1200,
  datesAndPlaces: 300,
} as const;

const giftInputBase = z.object({
  occasion: z.enum(OCCASION_IDS),
  customOccasion: trimmed(LIMITS.customOccasion).default(""),
  recipientName: trimmed(LIMITS.recipientName).min(1, "Tell us their name."),
  relationship: trimmed(LIMITS.relationship).min(1, "How do you know them?"),
  pronouns: z.enum(["she", "he", "they", "unspecified"]).default("unspecified"),
  ageRange: z.enum(["child", "teen", "adult", "older", "unspecified"]).default("unspecified"),
  recipientContext: trimmed(LIMITS.recipientContext).default(""),
  senderName: trimmed(LIMITS.senderName).min(1, "Sign it with your name."),
  message: trimmed(LIMITS.messageMax).min(LIMITS.messageMin, "Write a little more — at least a sentence or two."),
  memories: trimmed(LIMITS.memories).default(""),
  datesAndPlaces: trimmed(LIMITS.datesAndPlaces).default(""),
  tone: z.enum(TONE_IDS),
  transformation: z.enum(["close", "story", "poetic"]).default("story"),
  theme: z.enum(THEME_IDS),
  music: z.enum(MUSIC_MOOD_IDS),
  narration: z.boolean().default(false),
});

function requireCustomOccasion(value: { occasion: string; customOccasion: string }, ctx: z.RefinementCtx) {
  if (value.occasion === "other" && value.customOccasion.length === 0) {
    ctx.addIssue({ code: "custom", path: ["customOccasion"], message: "Tell us the occasion." });
  }
}

export const giftInputSchema = giftInputBase.superRefine(requireCustomOccasion);

export type GiftInputParsed = z.infer<typeof giftInputSchema>;

/** Per-step schemas used by the wizard for inline validation. */
export const stepSchemas = {
  occasion: giftInputBase.pick({ occasion: true, customOccasion: true }).superRefine(requireCustomOccasion),
  recipient: giftInputBase.pick({
    recipientName: true,
    relationship: true,
    pronouns: true,
    ageRange: true,
    recipientContext: true,
    senderName: true,
  }),
  message: giftInputBase.pick({ message: true, memories: true, datesAndPlaces: true, tone: true, transformation: true }),
  style: giftInputBase.pick({ theme: true }),
  sound: giftInputBase.pick({ music: true, narration: true }),
} as const;

/** Sender edits after generation. All optional; validated server-side. */
export const storyEditSchema = z.object({
  title: trimmed(120).optional(),
  opening: trimmed(1500).optional(),
  closing: trimmed(1500).optional(),
  dedication: trimmed(300).optional(),
  scenes: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        heading: trimmed(120).optional(),
        text: trimmed(1500).optional(),
      }),
    )
    .max(12)
    .optional(),
  /** New order of scene ids. Must be a permutation of the existing ids. */
  sceneOrder: z.array(z.string().min(1).max(64)).max(12).optional(),
});

export const giftSettingsEditSchema = z.object({
  recipientName: trimmed(LIMITS.recipientName).min(1).optional(),
  senderName: trimmed(LIMITS.senderName).min(1).optional(),
  theme: z.enum(THEME_IDS).optional(),
  music: z.enum(MUSIC_MOOD_IDS).optional(),
  narration: z.boolean().optional(),
});

export const shippingAddressSchema = z.object({
  name: trimmed(80).min(1, "Who should we address it to?"),
  line1: trimmed(120).min(1, "Add the first line of the address."),
  line2: trimmed(120).default(""),
  city: trimmed(80).min(1, "Add a town or city."),
  postcode: trimmed(16).min(1, "Add a postcode."),
  country: trimmed(2).default("GB"),
  giftNote: trimmed(200).default(""),
});

export function formatIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
