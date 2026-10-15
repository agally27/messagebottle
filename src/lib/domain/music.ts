/**
 * Music moods. The procedural (browser-generated) soundtrack interprets these
 * directly; a real music provider would receive the `prompt`.
 */
import type { CarolId } from "./carols";

export type MusicMoodId = "piano" | "cinematic" | "romantic" | "peaceful" | "celebratory" | "carol-silent-night" | "carol-we-wish" | "carol-jingle-bells" | "carol-deck-the-halls" | "none";

export interface MusicMood {
  id: MusicMoodId;
  label: string;
  description: string;
  /** Prompt for a generative music provider. */
  prompt: string;
  /** Parameters for the procedural engine. */
  procedural: {
    bpm: number;
    /** Scale degrees in semitones from the root. */
    scale: number[];
    /** Root MIDI note. */
    root: number;
    /** Chord progression as scale-degree roots (0-based). */
    progression: number[];
    /** Timbre family. */
    voice: "piano" | "pad" | "pluck" | "bell";
    /** Amount of arpeggiation 0–1. */
    arpeggio: number;
    /** Reverb wetness 0–1. */
    reverb: number;
  } | null;
  /** A traditional carol tune (played instead of generative music). */
  carol?: CarolId;
  /** Only offered for these occasions. */
  occasions?: string[];
}

export const MUSIC_MOODS: readonly MusicMood[] = [
  {
    id: "piano",
    label: "Gentle piano",
    description: "Slow, spacious piano. Lets every word land.",
    prompt: "gentle solo piano, slow tempo, warm and intimate, emotional but understated",
    procedural: { bpm: 62, scale: [0, 2, 4, 5, 7, 9, 11], root: 60, progression: [0, 5, 3, 4], voice: "piano", arpeggio: 0.55, reverb: 0.5 },
  },
  {
    id: "cinematic",
    label: "Cinematic & emotional",
    description: "Swelling strings-like pads with a slow heartbeat.",
    prompt: "cinematic emotional score, soft strings and piano, slow build, hopeful",
    procedural: { bpm: 56, scale: [0, 2, 3, 5, 7, 8, 10], root: 57, progression: [0, 3, 5, 4], voice: "pad", arpeggio: 0.25, reverb: 0.7 },
  },
  {
    id: "romantic",
    label: "Romantic",
    description: "Warm, tender and close.",
    prompt: "romantic piano and soft pads, tender, warm, slow waltz feel",
    procedural: { bpm: 66, scale: [0, 2, 4, 5, 7, 9, 11], root: 62, progression: [0, 3, 4, 0], voice: "piano", arpeggio: 0.7, reverb: 0.55 },
  },
  {
    id: "peaceful",
    label: "Peaceful & reflective",
    description: "Still water. Bells and air.",
    prompt: "peaceful ambient, soft bells and pads, meditative, slow, spacious",
    procedural: { bpm: 50, scale: [0, 2, 4, 7, 9], root: 64, progression: [0, 4, 3, 0], voice: "bell", arpeggio: 0.4, reverb: 0.8 },
  },
  {
    id: "celebratory",
    label: "Upbeat & celebratory",
    description: "Bright plucks with a spring in their step.",
    prompt: "uplifting acoustic, bright plucked strings and light percussion, joyful, celebratory",
    procedural: { bpm: 96, scale: [0, 2, 4, 5, 7, 9, 11], root: 65, progression: [0, 4, 5, 3], voice: "pluck", arpeggio: 0.85, reverb: 0.35 },
  },
  {
    id: "carol-silent-night",
    label: "Silent Night",
    description: "The gentlest carol, on soft bells, with words written for them.",
    prompt: "",
    procedural: null,
    carol: "silent-night",
    occasions: ["christmas"],
  },
  {
    id: "carol-we-wish",
    label: "We Wish You a Merry Christmas",
    description: "A cheerful waltz to sing around the table.",
    prompt: "",
    procedural: null,
    carol: "we-wish",
    occasions: ["christmas"],
  },
  {
    id: "carol-jingle-bells",
    label: "Jingle Bells",
    description: "Bright plucks and sleigh bells. Best for children.",
    prompt: "",
    procedural: null,
    carol: "jingle-bells",
    occasions: ["christmas"],
  },
  {
    id: "carol-deck-the-halls",
    label: "Deck the Halls",
    description: "Fa la la, with bells and a festive bounce.",
    prompt: "",
    procedural: null,
    carol: "deck-the-halls",
    occasions: ["christmas"],
  },
  {
    id: "none",
    label: "No music",
    description: "Silence, or just the words.",
    prompt: "",
    procedural: null,
  },
] as const;

export const MUSIC_MOOD_IDS = MUSIC_MOODS.map((m) => m.id) as [MusicMoodId, ...MusicMoodId[]];

export function getMusicMood(id: MusicMoodId): MusicMood {
  const found = MUSIC_MOODS.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown music mood: ${id}`);
  return found;
}

export function isCarol(id: MusicMoodId): boolean {
  return Boolean(getMusicMood(id).carol);
}

/** Moods offered for an occasion (carols only at Christmas; nothing celebratory for remembrance). */
export function moodsForOccasion(occasion: string): MusicMood[] {
  return MUSIC_MOODS.filter((m) => (!m.occasions || m.occasions.includes(occasion)) && !(occasion === "remembrance" && m.id === "celebratory"));
}

/** Honest label shown with the soundtrack. */
export function musicDisclosure(id: MusicMoodId): string {
  const m = getMusicMood(id);
  return m.carol
    ? `${m.label}: a traditional carol, played on your device. The words were written for you.`
    : "Demonstration soundtrack, generated on your device from the chosen mood.";
}
