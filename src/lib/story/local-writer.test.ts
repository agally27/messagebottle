import { describe, expect, it } from "vitest";
import { buildBrief, splitSentences } from "./brief";
import { writeLocalStory } from "./local-writer";
import { checkStory } from "./quality";
import { assignScenes } from "./scenes";
import type { GiftInput } from "@/lib/domain/types";
import { storyDraftSchema } from "@/lib/providers/types";

const base: GiftInput = {
  occasion: "love",
  customOccasion: "",
  recipientName: "Eleanor",
  relationship: "my wife",
  pronouns: "she",
  ageRange: "adult",
  recipientContext: "",
  senderName: "Tom",
  message:
    "I still remember the first time you laughed at one of my terrible jokes. You didn't have to, but you did. Ten years later you still do, and it still makes my whole day. Thank you for choosing this ordinary life with me. I would choose it again every single time.",
  memories: "That rainy afternoon in Whitby when we shared chips under the pier.",
  datesAndPlaces: "Whitby, 14 June 2016",
  tone: "romantic",
  transformation: "story",
  theme: "ocean",
  music: "piano",
  narration: false,
};

describe("splitSentences", () => {
  it("splits on terminal punctuation", () => {
    expect(splitSentences("One. Two! Three? Four")).toEqual(["One.", "Two!", "Three?", "Four"]);
  });
  it("returns a single sentence when there is no punctuation", () => {
    expect(splitSentences("just words here")).toEqual(["just words here"]);
  });
});

describe("local story writer", () => {
  it("produces a valid, personalised draft that keeps every sentence", () => {
    const brief = buildBrief(base);
    const draft = writeLocalStory(brief);
    expect(storyDraftSchema.safeParse(draft).success).toBe(true);
    const report = checkStory(brief, draft);
    expect(report.issues).toEqual([]);
    expect(report.coverage).toBe(1);
    const all = JSON.stringify(draft);
    expect(all).toContain("Eleanor");
    expect(all).toContain("Tom");
    expect(all).toContain("Whitby");
    expect(draft.scenes.length).toBeGreaterThanOrEqual(2);
    expect(draft.scenes.length).toBeLessThanOrEqual(6);
  });

  it("is deterministic for the same input", () => {
    const a = writeLocalStory(buildBrief(base));
    const b = writeLocalStory(buildBrief(base));
    expect(a).toEqual(b);
  });

  it("keeps close-to-original mode free of added headings and leads", () => {
    const draft = writeLocalStory(buildBrief({ ...base, transformation: "close" }));
    expect(draft.scenes.every((s) => s.heading === "")).toBe(true);
    expect(draft.scenes[0]!.text.startsWith("I still remember")).toBe(true);
  });

  it("uses gentle framing for remembrance and never celebrates", () => {
    const brief = buildBrief({ ...base, occasion: "remembrance", tone: "reflective", message: "Your dad told the worst jokes and the best stories. I miss hearing them with you. I am here, whenever you want to talk about him." });
    const draft = writeLocalStory(brief);
    expect(checkStory(brief, draft).ok).toBe(true);
    expect(/celebrat|congratulations/i.test(JSON.stringify(draft))).toBe(false);
  });

  it("handles a very short message without crashing", () => {
    const brief = buildBrief({ ...base, message: "I love you more than you know. Always have." });
    const draft = writeLocalStory(brief);
    expect(storyDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.scenes.length).toBeGreaterThanOrEqual(2);
  });

  it("assigns varied procedural art with a time-of-day arc", () => {
    const brief = buildBrief(base);
    const scenes = assignScenes("gift-1", writeLocalStory(brief), "ocean", "love");
    expect(scenes.every((s) => s.art.kind === "procedural")).toBe(true);
    for (let i = 1; i < scenes.length; i++) {
      const prev = scenes[i - 1]!.art;
      const cur = scenes[i]!.art;
      if (prev.kind === "procedural" && cur.kind === "procedural") expect(cur.spec.motif).not.toBe(prev.spec.motif);
    }
    expect(scenes.map((s) => s.id)).toEqual(scenes.map((_, i) => `scene-${i + 1}`));
  });

  it("quality check rejects a draft that drops the sender's words", () => {
    const brief = buildBrief(base);
    const bad = { title: "x", opening: "Hello Eleanor from Tom", scenes: [{ heading: "", text: "Something entirely invented.", artPrompt: "p" }, { heading: "", text: "More inventions.", artPrompt: "p" }], closing: "Bye", dedication: "" };
    const report = checkStory(brief, bad);
    expect(report.ok).toBe(false);
    expect(report.coverage).toBe(0);
  });
});

describe("sign-off formatting", () => {
  it("uses real line breaks, never a literal backslash-n", () => {
    const draft = writeLocalStory(buildBrief({ ...base, tone: "celebratory" }));
    expect(draft.closing).not.toContain("\\n");
    expect(draft.closing).toMatch(/\n/);
  });
});
