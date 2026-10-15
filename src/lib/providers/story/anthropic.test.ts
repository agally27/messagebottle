import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftInput } from "@/lib/domain/types";
import { buildBrief } from "@/lib/story/brief";
import { writeLocalStory } from "@/lib/story/local-writer";

// Mock the SDK so the provider's parsing and error handling run without a key or network.
const parse = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    constructor(public status: number | undefined, message: string) {
      super(message);
      this.name = "APIError";
    }
  }
  class Anthropic {
    messages = { parse };
  }
  return { Anthropic, APIError };
});
vi.mock("@anthropic-ai/sdk/helpers/zod", () => ({ zodOutputFormat: (schema: unknown) => ({ type: "json_schema", schema }) }));

const input: GiftInput = { occasion: "birthday", customOccasion: "", recipientName: "Maya", relationship: "my sister", pronouns: "she", ageRange: "adult", recipientContext: "", senderName: "Tom", message: "Happy birthday, Maya. You have always been the brave one. I am so proud of you.", memories: "", datesAndPlaces: "", tone: "celebratory", transformation: "story", theme: "storybook", music: "piano", narration: false, songUrl: "", rememberedName: "", rememberedDates: "" };

describe("AnthropicStoryProvider", () => {
  beforeEach(() => {
    parse.mockReset();
  });

  it("returns the parsed draft with model and usage", async () => {
    const { AnthropicStoryProvider } = await import("./anthropic");
    const brief = buildBrief(input);
    const draft = writeLocalStory(brief);
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: draft, usage: { input_tokens: 1200, output_tokens: 400 } });
    const provider = new AnthropicStoryProvider({ apiKey: "test-key", model: "test-model" });
    const result = await provider.write(brief, input);
    expect(result.provider).toBe("anthropic");
    expect(result.model).toBe("test-model");
    expect(result.draft.title).toBe(draft.title);
    expect(result.usage?.units).toBe(1600);
    expect(result.usage?.estimatedCostMinor).toBeGreaterThan(0);
    const call = parse.mock.calls[0]![0] as { messages: Array<{ content: string }>; output_config: { format: unknown } };
    expect(call.messages[0]!.content).toContain("Maya");
    expect(call.messages[0]!.content).toContain("No memory supplied");
    expect(call.output_config.format).toBeTruthy();
  });

  it("treats a refusal as permanent and missing output as transient", async () => {
    const { AnthropicStoryProvider } = await import("./anthropic");
    const { ProviderError } = await import("../types");
    const provider = new AnthropicStoryProvider({ apiKey: "test-key" });
    const brief = buildBrief(input);
    parse.mockResolvedValueOnce({ stop_reason: "refusal", parsed_output: null, usage: {} });
    await expect(provider.write(brief, input)).rejects.toMatchObject({ code: "refusal", permanent: true });
    parse.mockResolvedValueOnce({ stop_reason: "end_turn", parsed_output: null, usage: {} });
    const err = await provider.write(brief, input).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.permanent).toBe(false);
  });

  it("classifies API errors: auth/billing permanent, rate limit and 5xx transient", async () => {
    const { AnthropicStoryProvider } = await import("./anthropic");
    const sdk = await import("@anthropic-ai/sdk");
    const provider = new AnthropicStoryProvider({ apiKey: "test-key" });
    const brief = buildBrief(input);
    const cases: Array<[number, string, boolean]> = [[401, "auth", true], [402, "billing", true], [429, "rate_limited", false], [503, "upstream_error", false], [400, "invalid_request", true]];
    for (const [status, code, permanent] of cases) {
      parse.mockRejectedValueOnce(new sdk.APIError(status, `http ${status}`, undefined, undefined));
      await expect(provider.write(brief, input)).rejects.toMatchObject({ code, permanent });
    }
  });

  it("refuses to construct without a key", async () => {
    const { AnthropicStoryProvider } = await import("./anthropic");
    expect(() => new AnthropicStoryProvider({ apiKey: undefined })).toThrow(/ANTHROPIC_API_KEY/);
  });
});
