import type { StoryProvider, StoryResult } from "../types";
import { ProviderError } from "../types";

/** Placeholder until milestone 5 wires the Anthropic SDK with structured outputs. */
export class AnthropicStoryProvider implements StoryProvider {
  readonly id = "anthropic";
  readonly live = true;
  async write(): Promise<StoryResult> {
    throw new ProviderError("Anthropic story provider is not implemented yet", "not_implemented", true);
  }
}
