import { Anthropic, APIError } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env } from "@/lib/config/env";
import type { GiftInput } from "@/lib/domain/types";
import type { ContentBrief } from "@/lib/story/brief";
import { ProviderError, storyDraftSchema, type StoryProvider, type StoryResult } from "../types";

const SYSTEM_PROMPT = `You write short, personal gift stories for "Message in a Bottle".

You are given a BRIEF: a sender's own message to a recipient, plus the facts they supplied (names, relationship, occasion, tone, optional memory, date/place). Your job is to shape their words into a short illustrated story in a handful of scenes.

Rules, in order of importance:
1. The sender's meaning is sacred. Keep their sentences recognisably intact: the recipient must be able to feel that the sender wrote this. Quote the sender's message generously and in order. Do not paraphrase emotional claims into stronger or weaker ones.
2. NEVER invent facts: no new memories, events, names, dates, places, illnesses, promises, plans or inside jokes. Only the memory, date and place the sender gave may be used, and only as given. If the brief is thin, keep the story short rather than filling it.
3. Use the recipient's name naturally (two or three times in total), the sender's name in the opening and sign-off, and the relationship only in the sender's voice (e.g. "my sister").
4. Match the requested tone exactly. Avoid clichés, platitudes, exclamation marks and anything that sounds like a greeting card or a chatbot. Plain, specific, warm.
5. For a remembrance gift: gentle, honest, unhurried; never celebratory; never write as if the person who died is speaking; do not speculate about their feelings.
6. For a child recipient: short sentences, simple words, kind and clear.
7. Length: an opening of 1–3 sentences, 3–5 scenes of 1–4 sentences each (each scene may have a short heading), a closing of 1–3 sentences ending with the sign-off on its own line (e.g. "With love,\\nTom"), and a one-line dedication. Total under 350 words.
8. Transformation levels: "close" = keep the words almost exactly, only add the title, light headings, the opening frame and the dedication. "story" = gentle framing lines and headings around the sender's sentences. "poetic" = the sender's words set with line breaks and a softer rhythm, still their words.
9. Each scene needs an artPrompt: a concrete, text-free visual (landscape, light, weather, an object) consistent with the art direction, with no faces in close-up, no words in the image, and nothing that invents a fact (no specific real places unless the sender named one).

Return only the structured output.`;

function briefToPrompt(b: ContentBrief, input: GiftInput): string {
  const lines = [
    `Recipient: ${b.recipientName}`,
    `Sender: ${b.senderName}`,
    `Relationship (sender's voice): ${b.relationshipPhrase || "not given"}`,
    `Occasion: ${b.occasionLabel}${b.sensitive ? " (REMEMBRANCE — handle with care)" : ""}`,
    `Tone: ${b.toneLabel}`,
    `Transformation: ${b.transformation}`,
    `Recipient pronouns: ${b.pronouns === "unspecified" ? "avoid third person" : b.pronouns}`,
    `Recipient age range: ${b.ageRange}`,
    b.context ? `Context from the sender: ${b.context}` : "",
    `Art direction: ${b.artDirection}`,
    "",
    "SENDER'S MESSAGE (keep intact):",
    b.message,
    "",
    b.memories ? `MEMORY SUPPLIED BY THE SENDER (use as given, do not embellish):\n${b.memories}` : "No memory supplied — do not invent one.",
    b.datesAndPlaces ? `DATE / PLACE: ${b.datesAndPlaces}` : "No date or place supplied.",
    "",
    `Music mood chosen: ${input.music}`,
  ];
  return lines.filter((l) => l !== "").join("\n");
}

/**
 * Story provider backed by the Anthropic API with structured outputs. The
 * response is schema-constrained, then checked by the pipeline against the
 * brief; drift falls back to the local writer.
 *
 * NOT yet exercised against the live API in this repository (no key).
 */
export class AnthropicStoryProvider implements StoryProvider {
  readonly id = "anthropic";
  readonly live = true;
  private client: Anthropic;
  private model: string;

  constructor(opts: { apiKey?: string; model?: string } = {}) {
    const apiKey = opts.apiKey ?? env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new ProviderError("ANTHROPIC_API_KEY is not configured", "auth", true);
    this.client = new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 });
    this.model = opts.model ?? env.ANTHROPIC_MODEL;
  }

  async write(brief: ContentBrief, input: GiftInput, signal?: AbortSignal): Promise<StoryResult> {
    try {
      const response = await this.client.messages.parse(
        {
          model: this.model,
          max_tokens: 4000,
          output_config: { effort: "medium", format: zodOutputFormat(storyDraftSchema) },
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: briefToPrompt(brief, input) }],
        },
        { signal },
      );
      if (response.stop_reason === "refusal") throw new ProviderError("The model declined to write this story", "refusal", true);
      if (!response.parsed_output) throw new ProviderError("The model returned no structured story", "invalid_output", false);
      const usage = {
        provider: this.id,
        kind: "story" as const,
        units: (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0),
        unitLabel: "tokens",
        // Rough estimate; replace with the model's real pricing in production.
        estimatedCostMinor: Math.ceil(((response.usage.input_tokens ?? 0) * 0.0003 + (response.usage.output_tokens ?? 0) * 0.0015) * 100) / 100,
      };
      return { draft: response.parsed_output, provider: this.id, model: this.model, usage };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      if (err instanceof APIError) {
        const status = err.status ?? 500;
        const permanent = status === 400 || status === 401 || status === 402 || status === 403 || status === 404 || status === 422;
        const code = status === 401 || status === 403 ? "auth" : status === 402 ? "billing" : status === 429 ? "rate_limited" : status >= 500 ? "upstream_error" : "invalid_request";
        throw new ProviderError(`Anthropic API error (${status})`, code, permanent, err);
      }
      if (err instanceof Error && err.name === "AbortError") throw new ProviderError("Story generation timed out", "timeout", false, err);
      throw new ProviderError(err instanceof Error ? err.message : "Unknown story provider error", "unexpected", false, err);
    }
  }
}
