export type ToneId =
  | "heartfelt"
  | "romantic"
  | "playful"
  | "reassuring"
  | "nostalgic"
  | "celebratory"
  | "reflective";

export interface Tone {
  id: ToneId;
  label: string;
  description: string;
}

export const TONES: readonly Tone[] = [
  { id: "heartfelt", label: "Heartfelt", description: "Warm, sincere and direct." },
  { id: "romantic", label: "Romantic", description: "Tender, intimate, a little breathless." },
  { id: "playful", label: "Playful", description: "Light, affectionate, with room for a smile." },
  { id: "reassuring", label: "Reassuring", description: "Steady and calm. A hand on the shoulder." },
  { id: "nostalgic", label: "Nostalgic", description: "Looking back fondly, savouring details." },
  { id: "celebratory", label: "Celebratory", description: "Joyful and proud, raising a glass." },
  { id: "reflective", label: "Reflective", description: "Quiet, thoughtful and gentle." },
] as const;

export const TONE_IDS = TONES.map((t) => t.id) as [ToneId, ...ToneId[]];

export function getTone(id: ToneId): Tone {
  const found = TONES.find((t) => t.id === id);
  if (!found) throw new Error(`Unknown tone: ${id}`);
  return found;
}
