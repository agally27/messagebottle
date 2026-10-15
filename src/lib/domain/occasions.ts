import type { ThemeId } from "./themes";
import type { ToneId } from "./tones";
import type { MusicMoodId } from "./music";

export type OccasionId =
  | "love"
  | "christmas"
  | "birthday"
  | "family"
  | "friendship"
  | "thank-you"
  | "encouragement"
  | "memories"
  | "remembrance"
  | "just-because"
  | "other";

export interface Occasion {
  id: OccasionId;
  label: string;
  short: string;
  /** One-line description shown on the landing page and in the wizard. */
  description: string;
  /** Prompts offered to senders who struggle to find the words. */
  prompts: string[];
  defaultTone: ToneId;
  suggestedThemes: ThemeId[];
  /** Music chosen by default for this occasion. */
  defaultMusic?: MusicMoodId;
  /** Extra care: remembrance gets gentler language and no celebratory options. */
  sensitive?: boolean;
}

export const OCCASIONS: readonly Occasion[] = [
  {
    id: "love",
    label: "Love & romance",
    short: "Love",
    description: "For a partner, an anniversary, or the person you choose every day.",
    prompts: [
      "The moment I knew it was you…",
      "The small thing you do that I never want to live without…",
      "When I think about the years ahead…",
    ],
    defaultTone: "romantic",
    suggestedThemes: ["cinematic", "ocean", "watercolour"],
  },
  {
    id: "christmas",
    label: "Christmas",
    short: "Christmas",
    description: "A Christmas card that glows, sings and smells of the season. For family near or far.",
    prompts: [
      "What Christmas with you has always meant to me…",
      "The moment from this year I'll remember most…",
      "What I wish for you, and for all of us, next year…",
    ],
    defaultTone: "heartfelt",
    suggestedThemes: ["winter", "keepsake", "cinematic"],
    defaultMusic: "carol-silent-night",
  },
  {
    id: "birthday",
    label: "Birthday",
    short: "Birthday",
    description: "A birthday message that lasts longer than the candles.",
    prompts: [
      "This year, what I admired most about you was…",
      "My favourite memory of you from the last twelve months…",
      "What I wish for you in the year ahead…",
    ],
    defaultTone: "celebratory",
    suggestedThemes: ["storybook", "minimal", "watercolour"],
  },
  {
    id: "family",
    label: "Family",
    short: "Family",
    description: "From a parent, a child, a grandparent — the people who made you.",
    prompts: [
      "Something you taught me without ever meaning to…",
      "A day with you I still think about…",
      "What I want you to know, in case I don't say it enough…",
    ],
    defaultTone: "heartfelt",
    suggestedThemes: ["keepsake", "storybook", "watercolour"],
  },
  {
    id: "friendship",
    label: "Friendship",
    short: "Friendship",
    description: "For the friend who has been there through everything.",
    prompts: [
      "The time you showed up when I needed it…",
      "The thing that always makes us laugh…",
      "What our friendship has meant to me…",
    ],
    defaultTone: "playful",
    suggestedThemes: ["storybook", "minimal", "ocean"],
  },
  {
    id: "thank-you",
    label: "Thank you",
    short: "Thanks",
    description: "Gratitude that deserves more than a text.",
    prompts: [
      "What you did, and what it changed…",
      "What I noticed that you probably thought nobody did…",
      "How I'd like to say thank you properly…",
    ],
    defaultTone: "heartfelt",
    suggestedThemes: ["minimal", "watercolour", "keepsake"],
  },
  {
    id: "encouragement",
    label: "Encouragement",
    short: "Courage",
    description: "For someone facing something hard, who needs to hear they are not alone.",
    prompts: [
      "What I see in you that you might not see right now…",
      "A time you got through something and how you did it…",
      "What I'm here for, whenever you need it…",
    ],
    defaultTone: "reassuring",
    suggestedThemes: ["ocean", "minimal", "watercolour"],
  },
  {
    id: "memories",
    label: "Memories",
    short: "Memories",
    description: "How you met, a chapter you shared, the photos and the song that were yours.",
    prompts: [
      "The day we first met, and what I thought of you…",
      "Where we were and what it felt like…",
      "The detail I never want to forget…",
      "Why that moment still matters…",
    ],
    defaultTone: "nostalgic",
    suggestedThemes: ["watercolour", "keepsake", "cinematic"],
  },
  {
    id: "remembrance",
    label: "Remembrance",
    short: "Remembrance",
    description: "To honour someone who has died, or to comfort someone who is grieving.",
    prompts: [
      "What they were like, in a sentence only you could write…",
      "A memory of them that still brings warmth…",
      "What I want you to know while you grieve…",
    ],
    defaultTone: "reflective",
    suggestedThemes: ["minimal", "ocean", "watercolour"],
    sensitive: true,
  },
  {
    id: "just-because",
    label: "Just because",
    short: "Just because",
    description: "No occasion. Just something you've been meaning to say.",
    prompts: [
      "I've been meaning to tell you…",
      "Something ordinary about you that I love…",
      "What today made me think of…",
    ],
    defaultTone: "heartfelt",
    suggestedThemes: ["minimal", "storybook", "ocean"],
  },
  {
    id: "other",
    label: "Something else",
    short: "Other",
    description: "Tell us the occasion in your own words.",
    prompts: ["What this moment is, and why it matters…", "What I most want them to feel…"],
    defaultTone: "heartfelt",
    suggestedThemes: ["minimal", "watercolour", "storybook"],
  },
] as const;

export const OCCASION_IDS = OCCASIONS.map((o) => o.id) as [OccasionId, ...OccasionId[]];

export function getOccasion(id: OccasionId): Occasion {
  const found = OCCASIONS.find((o) => o.id === id);
  if (!found) throw new Error(`Unknown occasion: ${id}`);
  return found;
}
