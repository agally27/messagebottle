import { getMusicMood, musicDisclosure } from "@/lib/domain/music";
import type { MusicMoodId } from "@/lib/domain/types";
import type { MusicProvider, MusicResult } from "../types";

/**
 * No external music service: the recipient's browser synthesises a gentle,
 * royalty-free soundtrack from the chosen mood (see src/lib/audio). Labelled
 * honestly as a demonstration soundtrack.
 */
export class ProceduralMusicProvider implements MusicProvider {
  readonly id = "procedural";
  readonly live = false;
  async compose(mood: MusicMoodId): Promise<MusicResult | null> {
    if (mood === "none") return null;
    const m = getMusicMood(mood);
    return {
      source: { type: "procedural", mood },
      label: m.label,
      disclosure: musicDisclosure(mood),
    };
  }
}
