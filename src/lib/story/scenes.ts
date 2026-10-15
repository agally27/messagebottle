import { getTheme } from "@/lib/domain/themes";
import type { Motif, OccasionId, Scene, SceneArtSpec, ThemeId, TimeOfDay } from "@/lib/domain/types";
import type { StoryDraft } from "@/lib/providers/types";
import { hashString } from "@/lib/utils/random";

const KEYWORDS: Array<[Motif, RegExp]> = [
  ["boat", /\b(boat|sail|sailing|harbour|harbor|ferry|voyage|rowing)\b/i],
  ["shore", /\b(beach|sea|ocean|shore|coast|waves?|tide|sand|seaside|cornwall|devon)\b/i],
  ["stars", /\b(stars?|night sky|midnight|galaxy|moonlight|constellation)\b/i],
  ["window", /\b(home|house|kitchen|window|bedroom|sofa|living room|flat|apartment|morning coffee|tea)\b/i],
  ["path", /\b(walk|walking|road|path|journey|trail|hike|hiking|steps?|travel|adventure)\b/i],
  ["garden", /\b(garden|flowers?|roses?|bloom|spring|allotment|seeds?|grow|growing)\b/i],
  ["mountains", /\b(mountain|hills?|peak|summit|valley|lake district|highlands|alps)\b/i],
  ["city", /\b(city|london|town|streets?|train|station|lights|cafe|café|restaurant|bar)\b/i],
  ["tree", /\b(tree|park|forest|woods|oak|autumn|leaves)\b/i],
  ["lantern", /\b(light|lantern|candle|glow|warmth|warm|fire|hope)\b/i],
  ["letter", /\b(letter|write|wrote|writing|words|note|paper|pen|read|reading|book)\b/i],
  ["bottle", /\b(bottle|message|drift|float|found|keep|kept)\b/i],
];

const OCCASION_DEFAULTS: Record<OccasionId, Motif[]> = {
  love: ["lantern", "shore", "stars", "window", "path"],
  birthday: ["garden", "lantern", "tree", "city", "stars"],
  family: ["window", "tree", "garden", "path", "lantern"],
  friendship: ["path", "city", "shore", "tree", "stars"],
  "thank-you": ["letter", "lantern", "garden", "window", "path"],
  encouragement: ["boat", "mountains", "path", "lantern", "stars"],
  memories: ["shore", "tree", "window", "mountains", "stars"],
  remembrance: ["stars", "shore", "tree", "lantern", "window"],
  "just-because": ["letter", "garden", "window", "shore", "stars"],
  other: ["letter", "lantern", "shore", "path", "stars"],
};

export function motifForText(text: string, occasion: OccasionId): Motif {
  for (const [motif, re] of KEYWORDS) if (re.test(text)) return motif;
  return OCCASION_DEFAULTS[occasion][0] ?? "shore";
}

const LIGHT_ARC: TimeOfDay[] = ["dawn", "day", "day", "dusk", "dusk", "night"];
const DARK_ARC: TimeOfDay[] = ["dusk", "night", "night", "dusk", "night", "night"];

export function timeOfDayArc(count: number, theme: ThemeId): TimeOfDay[] {
  const arc = getTheme(theme).mode === "dark" ? DARK_ARC : LIGHT_ARC;
  if (count <= 1) return [arc[arc.length - 1]!];
  return Array.from({ length: count }, (_, i) => arc[Math.round((i / (count - 1)) * (arc.length - 1))]!);
}

/**
 * Assigns a procedural art spec to every scene: a motif inferred from the
 * text (with occasion defaults and no immediate repeats), a time-of-day arc
 * across the story, and a deterministic seed per gift and scene.
 */
export function assignScenes(giftId: string, draft: StoryDraft, theme: ThemeId, occasion: OccasionId): Scene[] {
  const arc = timeOfDayArc(draft.scenes.length, theme);
  const defaults = OCCASION_DEFAULTS[occasion];
  let previous: Motif | null = null;
  return draft.scenes.map((s, i) => {
    let motif = motifForText(`${s.heading} ${s.text} ${s.artPrompt}`, occasion);
    if (motif === previous) motif = defaults.find((m) => m !== previous) ?? motif;
    if (i === draft.scenes.length - 1 && motif === previous) motif = "bottle";
    previous = motif;
    const spec: SceneArtSpec = { theme, motif, timeOfDay: arc[i] ?? "dusk", seed: hashString(`${giftId}:${i}:${motif}`) };
    return {
      id: `scene-${i + 1}`,
      order: i,
      heading: s.heading,
      text: s.text,
      artPrompt: s.artPrompt,
      art: { kind: "procedural", spec, alt: altFor(spec) },
    };
  });
}

export function altFor(spec: SceneArtSpec): string {
  const motifText: Record<Motif, string> = {
    shore: "a quiet shoreline",
    bottle: "a bottle drifting on the water",
    lantern: "a lantern glowing over the water",
    stars: "a sky full of stars over the sea",
    window: "a lit window",
    path: "a path winding towards the horizon",
    tree: "a tree on a hill",
    letter: "a letter floating above the water",
    boat: "a small boat on open water",
    garden: "a garden in bloom",
    mountains: "mountains above a lake",
    city: "city lights at the water's edge",
  };
  return `Illustration of ${motifText[spec.motif]} at ${spec.timeOfDay}`;
}
