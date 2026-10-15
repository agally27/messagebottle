import type { GiftInput, PublicGift } from "@/lib/domain/types";
import { buildBrief } from "@/lib/story/brief";
import { writeLocalStory } from "@/lib/story/local-writer";
import { assignScenes } from "@/lib/story/scenes";

/** A complete sample gift, composed locally. Used by /example and tests. */
export const EXAMPLE_INPUT: GiftInput = {
  occasion: "love",
  customOccasion: "",
  recipientName: "Eleanor",
  relationship: "my wife",
  pronouns: "she",
  ageRange: "adult",
  recipientContext: "",
  senderName: "Tom",
  message:
    "I still remember the first time you laughed at one of my terrible jokes. You didn't have to, but you did, and I think I decided something right then without telling you. Ten years on, you still laugh, and it still makes my whole day.\n\nThank you for choosing this ordinary life with me: the burnt toast, the long drives, the arguments about maps. I would choose it again every single time. Happy anniversary, love.",
  memories: "That rainy afternoon in Whitby when we shared chips under the pier and you said this was the best day of your life, and meant it.",
  datesAndPlaces: "Whitby, 14 June 2016",
  tone: "romantic",
  transformation: "story",
  theme: "ocean",
  music: "piano",
  narration: true,
};

export function buildExampleGift(): PublicGift {
  const brief = buildBrief(EXAMPLE_INPUT);
  const draft = writeLocalStory(brief);
  const scenes = assignScenes("example-gift", draft, EXAMPLE_INPUT.theme, EXAMPLE_INPUT.occasion);
  return {
    token: "example",
    recipientName: EXAMPLE_INPUT.recipientName,
    senderName: EXAMPLE_INPUT.senderName,
    occasion: EXAMPLE_INPUT.occasion,
    theme: EXAMPLE_INPUT.theme,
    story: {
      title: draft.title,
      opening: draft.opening,
      scenes: scenes.map((s) => ({ id: s.id, order: s.order, heading: s.heading, text: s.text, art: s.art })),
      closing: draft.closing,
      dedication: draft.dedication,
    },
    audio: [{ kind: "music", source: { type: "procedural", mood: "piano" }, provider: "procedural", label: "Gentle piano", disclosure: "Demonstration soundtrack, generated on your device from the chosen mood." }],
    narrationEnabled: true,
  };
}
