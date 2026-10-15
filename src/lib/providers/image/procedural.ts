import type { ImageProvider, ImageResult } from "../types";

/** Keeps the deterministic SVG scene art; nothing to generate or store. */
export class ProceduralImageProvider implements ImageProvider {
  readonly id = "procedural";
  readonly live = false;
  async generate(): Promise<ImageResult | null> {
    return null;
  }
}
