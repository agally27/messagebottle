import type { NarrationProvider, NarrationResult } from "../types";

/** No server narration. The recipient can use their device's own voice (client-side). */
export class NoNarrationProvider implements NarrationProvider {
  readonly id = "none";
  readonly live = false;
  async narrate(): Promise<NarrationResult | null> {
    return null;
  }
}
