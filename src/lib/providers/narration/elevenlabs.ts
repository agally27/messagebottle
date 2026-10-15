import type { NarrationProvider, NarrationResult } from "../types";
import { ProviderError } from "../types";

/** Placeholder until milestone 5. */
export class ElevenLabsNarrationProvider implements NarrationProvider {
  readonly id = "elevenlabs";
  readonly live = true;
  async narrate(): Promise<NarrationResult | null> {
    throw new ProviderError("ElevenLabs narration provider is not implemented yet", "not_implemented", true);
  }
}
