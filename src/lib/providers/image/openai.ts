import type { ImageProvider, ImageResult } from "../types";
import { ProviderError } from "../types";

/** Placeholder until milestone 5. */
export class OpenAiImageProvider implements ImageProvider {
  readonly id = "openai";
  readonly live = true;
  async generate(): Promise<ImageResult | null> {
    throw new ProviderError("OpenAI image provider is not implemented yet", "not_implemented", true);
  }
}
