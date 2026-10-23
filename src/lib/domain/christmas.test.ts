import { describe, expect, it } from "vitest";
import { CAROLS, carolLengthBeats, personaliseCarol } from "./carols";
import { MUSIC_MOODS, moodsForOccasion } from "./music";
import { getOccasion } from "./occasions";
import { getTheme } from "./themes";
import { isInSeason } from "@/lib/config/products";
import { getProduct, listProducts, priceOrder } from "@/lib/config/catalogue";
import { buildBrief } from "@/lib/story/brief";
import { writeLocalStory } from "@/lib/story/local-writer";
import { assignScenes, withCarolScene } from "@/lib/story/scenes";
import { checkStory } from "@/lib/story/quality";
import type { GiftInput } from "./types";

describe("carols", () => {
  it.each(Object.values(CAROLS))("$title: every bar fills exactly one bar of time", (c) => {
    for (const [i, bar] of c.bars.entries()) {
      const beats = bar.notes.reduce((a, [, d]) => a + d, 0);
      expect(beats, `bar ${i + 1}`).toBe(c.beatsPerBar);
    }
    expect(carolLengthBeats(c)).toBeGreaterThan(c.beatsPerBar * 6);
  });

  it("every carol mood points at a real carol and is offered only at Christmas", () => {
    const carols = MUSIC_MOODS.filter((m) => m.carol);
    expect(carols.map((m) => m.carol).sort()).toEqual(Object.keys(CAROLS).sort());
    expect(moodsForOccasion("birthday").some((m) => m.carol)).toBe(false);
    expect(moodsForOccasion("christmas").filter((m) => m.carol)).toHaveLength(4);
  });

  it("personalises the words with both names and leaves no placeholders", () => {
    for (const id of Object.keys(CAROLS) as Array<keyof typeof CAROLS>) {
      const words = personaliseCarol(id, "Grandma and Grandad", "the Gally family");
      expect(words).toContain("Grandma and Grandad");
      expect(words).toContain("the Gally family");
      expect(words).not.toMatch(/\{[RS]\}/);
    }
  });
});

const input: GiftInput = {
  occasion: "christmas", customOccasion: "", recipientName: "Grandma and Grandad", relationship: "my grandparents", pronouns: "they", ageRange: "older",
  recipientContext: "", senderName: "the Gally family",
  message: "Merry Christmas from all of us. We miss your kitchen, your terrible cracker jokes and your enormous trifle. We will be with you on Boxing Day, and we cannot wait.",
  memories: "", datesAndPlaces: "", tone: "heartfelt", transformation: "story", theme: "winter", music: "carol-silent-night", narration: false, songUrl: "", rememberedName: "", rememberedDates: "",
};

describe("Christmas story", () => {
  it("adds a carol scene with their names, keeps every sentence, and draws fir trees in snow", () => {
    expect(getOccasion("christmas").defaultMusic).toBe("carol-silent-night");
    expect(getTheme("winter").mode).toBe("dark");
    const brief = buildBrief(input);
    const draft = withCarolScene(writeLocalStory(brief), input.recipientName, input.senderName, input.music);
    const carol = draft.scenes.at(-1)!;
    expect(carol.heading).toBe("A carol for you");
    expect(carol.text).toContain("Grandma and Grandad, you're in our hearts today");
    expect(carol.text).toContain("tune of Silent Night");
    expect(checkStory(brief, draft).issues).toEqual([]);
    const scenes = assignScenes("xmas-1", draft, "winter", "christmas");
    expect(scenes.some((s) => s.art.kind === "procedural" && s.art.spec.motif === "fir")).toBe(true);
  });

  it("adds no carol when ordinary music is chosen, and never twice", () => {
    const brief = buildBrief({ ...input, music: "piano" });
    const plain = writeLocalStory(brief);
    expect(withCarolScene(plain, "A", "B", "piano")).toBe(plain);
    const once = withCarolScene(plain, "A", "B", "carol-we-wish");
    expect(withCarolScene(once, "A", "B", "carol-we-wish").scenes.length).toBe(once.scenes.length);
  });
});

describe("Christmas Bottle availability", () => {
  const nov = new Date("2026-11-20T12:00:00Z");
  const jan = new Date("2027-01-10T12:00:00Z");
  const lastDay = new Date("2026-12-18T23:30:00Z"); // still 18 Dec in London
  const dayAfter = new Date("2026-12-19T00:30:00Z");

  it("is sold only inside its season (UK dates)", () => {
    const p = getProduct("christmas-bottle", { now: nov })!;
    expect(p.scentOptions?.map((s) => s.id)).toEqual(["winter-spice", "fireside-pine", "unscented"]);
    expect(getProduct("christmas-bottle", { now: jan })).toBeNull();
    expect(isInSeason(p, lastDay)).toBe(true);
    expect(isInSeason(p, dayAfter)).toBe(false);
    expect(priceOrder("christmas-bottle", 1, { now: nov })?.totalMinor).toBe(1999 + 395);
    expect(priceOrder("christmas-bottle", 1, { now: jan })).toBeNull();
  });

  it("is kept out of the evergreen product grid but offered at checkout in season", () => {
    expect(listProducts({ now: nov, seasonal: false }).some((p) => p.id === "christmas-bottle")).toBe(false);
    expect(listProducts({ now: nov }).some((p) => p.id === "christmas-bottle")).toBe(true);
    expect(listProducts({ now: jan }).some((p) => p.id === "christmas-bottle")).toBe(false);
  });
});
