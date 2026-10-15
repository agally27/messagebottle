/**
 * Visual themes. Each theme drives the palette, typography mood, motion and
 * the procedural scene art used when no image provider is configured.
 */
export type ThemeId = "storybook" | "cinematic" | "watercolour" | "minimal" | "ocean" | "keepsake" | "winter";

export interface ThemePalette {
  /** Scene background (deep). */
  bg: string;
  /** Secondary background tone used for horizon / depth. */
  bg2: string;
  /** Primary foreground / ink colour for text on scenes. */
  ink: string;
  /** Muted text. */
  inkMuted: string;
  /** Accent (light sources, highlights). */
  accent: string;
  /** Secondary accent. */
  accent2: string;
  /** Paper tone for text cards. */
  paper: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  /** Short art direction used in image prompts and the procedural renderer. */
  artDirection: string;
  palette: ThemePalette;
  /** Whether scene text sits on a dark or light background. */
  mode: "dark" | "light";
  /** Display typography treatment. */
  typography: "serif" | "serif-italic" | "sans";
  /** Motion intensity 0–1 (respecting reduced-motion always). */
  motion: number;
}

export const THEMES: readonly Theme[] = [
  {
    id: "storybook",
    name: "Illustrated storybook",
    description: "Soft illustrated pages with warm light, like a book made just for them.",
    artDirection:
      "soft illustrated storybook, gentle gouache textures, warm golden light, rounded shapes, cosy and inviting",
    palette: {
      bg: "#f3e7d3",
      bg2: "#e4cfae",
      ink: "#3b2f2a",
      inkMuted: "#7a6a60",
      accent: "#d9a441",
      accent2: "#7aa58a",
      paper: "#fff8ec",
    },
    mode: "light",
    typography: "serif",
    motion: 0.6,
  },
  {
    id: "cinematic",
    name: "Romantic cinematic",
    description: "Deep dusk tones, slow fades and a single warm light. Like the last scene of a film.",
    artDirection:
      "cinematic widescreen, dusk and golden hour, deep blues with warm amber light, soft bokeh, intimate and emotional",
    palette: {
      bg: "#1a1f3a",
      bg2: "#2e2a4f",
      ink: "#f6ecdf",
      inkMuted: "#c7bdb3",
      accent: "#f0a868",
      accent2: "#8e7cc3",
      paper: "#f6ecdf",
    },
    mode: "dark",
    typography: "serif-italic",
    motion: 0.8,
  },
  {
    id: "watercolour",
    name: "Watercolour memories",
    description: "Washes of colour that bleed into paper, as if painted from memory.",
    artDirection:
      "loose watercolour painting, soft bleeding washes, visible paper texture, pastel sea and sky tones, dreamy and tender",
    palette: {
      bg: "#eef3f4",
      bg2: "#d7e5e6",
      ink: "#2b3a4a",
      inkMuted: "#6c7b8a",
      accent: "#d98b74",
      accent2: "#5f9ea0",
      paper: "#fbfbf7",
    },
    mode: "light",
    typography: "serif",
    motion: 0.5,
  },
  {
    id: "minimal",
    name: "Minimal & elegant",
    description: "Cream paper, fine lines and plenty of quiet. The words do the work.",
    artDirection:
      "minimal line illustration on cream paper, fine ink lines, one accent colour, lots of negative space, elegant and calm",
    palette: {
      bg: "#fbf8f1",
      bg2: "#efe6d6",
      ink: "#1c2333",
      inkMuted: "#5b6578",
      accent: "#c9a961",
      accent2: "#2c5f8a",
      paper: "#fffdf8",
    },
    mode: "light",
    typography: "serif",
    motion: 0.35,
  },
  {
    id: "ocean",
    name: "Dreamlike ocean",
    description: "Moonlit water, drifting light and the hush of the shore. Our signature.",
    artDirection:
      "dreamlike moonlit ocean, deep teal and navy, soft drifting light on water, stars, bioluminescence, calm and magical",
    palette: {
      bg: "#0f2a3f",
      bg2: "#1b4a5e",
      ink: "#eef6f5",
      inkMuted: "#a9c3c6",
      accent: "#9fe3d8",
      accent2: "#c9a961",
      paper: "#eef6f5",
    },
    mode: "dark",
    typography: "serif",
    motion: 0.7,
  },
  {
    id: "keepsake",
    name: "Warm family keepsake",
    description: "Sun-faded photographs, linen and old wood. Comfort you can almost touch.",
    artDirection:
      "warm nostalgic keepsake, linen and aged paper textures, sepia and terracotta tones, afternoon light through a window, homely",
    palette: {
      bg: "#f1e4d4",
      bg2: "#dcc3a6",
      ink: "#3f2f26",
      inkMuted: "#7d6a5c",
      accent: "#c4664a",
      accent2: "#8a9a6b",
      paper: "#fbf3e8",
    },
    mode: "light",
    typography: "serif",
    motion: 0.45,
  },
  {
    id: "winter",
    name: "Winter wonderland",
    description: "Falling snow, fir trees and the glow of fairy lights. Made for Christmas.",
    artDirection:
      "snowy winter night, fir trees with warm fairy lights, falling snow, deep pine green and berry red with gold light, cosy and festive",
    palette: {
      bg: "#122820",
      bg2: "#1f4136",
      ink: "#f7f1e6",
      inkMuted: "#c9d6cc",
      accent: "#f2c46d",
      accent2: "#b8403a",
      paper: "#f7f1e6",
    },
    mode: "dark",
    typography: "serif",
    motion: 0.7,
  },
] as const;

export const THEME_IDS = THEMES.map((t) => t.id) as [ThemeId, ...ThemeId[]];

export function getTheme(id: ThemeId): Theme {
  const found = THEMES.find((t) => t.id === id);
  if (!found) throw new Error(`Unknown theme: ${id}`);
  return found;
}
