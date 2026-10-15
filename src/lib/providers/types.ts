import { z } from "zod";
import type { GiftInput, JobUsage, MusicMoodId, Scene, SceneArtSpec, Story } from "@/lib/domain/types";
import type { ContentBrief } from "@/lib/story/brief";

/* ── Story ─────────────────────────────────────────────────────────────────── */

export const storyDraftSchema = z.object({
  title: z.string().trim().min(1).max(120),
  opening: z.string().trim().min(1).max(1500),
  scenes: z
    .array(
      z.object({
        heading: z.string().trim().max(120),
        text: z.string().trim().min(1).max(1500),
        artPrompt: z.string().trim().min(1).max(600),
      }),
    )
    .min(2)
    .max(8),
  closing: z.string().trim().min(1).max(1500),
  dedication: z.string().trim().max(300),
});

export type StoryDraft = z.infer<typeof storyDraftSchema>;

export interface StoryResult {
  draft: StoryDraft;
  provider: string;
  model?: string;
  usage?: JobUsage;
}

export interface StoryProvider {
  readonly id: string;
  /** true when this provider calls an external paid service. */
  readonly live: boolean;
  write(brief: ContentBrief, input: GiftInput, signal?: AbortSignal): Promise<StoryResult>;
}

/* ── Image ─────────────────────────────────────────────────────────────────── */

export interface ImageRequest {
  giftId: string;
  scene: Pick<Scene, "id" | "order" | "artPrompt">;
  spec: SceneArtSpec;
  artDirection: string;
}

export interface ImageResult {
  /** Stored, controlled URL (signed or public) — never a temporary provider URL. */
  url: string;
  assetId: string;
  alt: string;
  width?: number;
  height?: number;
  usage?: JobUsage;
}

export interface ImageProvider {
  readonly id: string;
  readonly live: boolean;
  /** Providers that cannot render (procedural) return null and the scene keeps its spec. */
  generate(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult | null>;
}

/* ── Music ─────────────────────────────────────────────────────────────────── */

export interface MusicResult {
  source: { type: "procedural"; mood: MusicMoodId } | { type: "url"; url: string; assetId: string; durationMs?: number };
  label: string;
  disclosure?: string;
  usage?: JobUsage;
}

export interface MusicProvider {
  readonly id: string;
  readonly live: boolean;
  compose(mood: MusicMoodId, prompt: string, giftId: string, signal?: AbortSignal): Promise<MusicResult | null>;
}

/* ── Narration ─────────────────────────────────────────────────────────────── */

export interface NarrationResult {
  url: string;
  assetId: string;
  durationMs?: number;
  usage?: JobUsage;
}

export interface NarrationProvider {
  readonly id: string;
  readonly live: boolean;
  /** Returns null when narration is unavailable; the client offers device speech instead. */
  narrate(story: Story, giftId: string, signal?: AbortSignal): Promise<NarrationResult | null>;
}

/* ── Errors ────────────────────────────────────────────────────────────────── */

/** Thrown by providers to tell the job runner whether a retry can help. */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly permanent: boolean,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export function classifyHttpStatus(status: number): { code: string; permanent: boolean } {
  if (status === 401 || status === 403) return { code: "auth", permanent: true };
  if (status === 402) return { code: "billing", permanent: true };
  if (status === 400 || status === 404 || status === 422) return { code: "invalid_request", permanent: true };
  if (status === 429) return { code: "rate_limited", permanent: false };
  if (status >= 500) return { code: "upstream_error", permanent: false };
  return { code: `http_${status}`, permanent: false };
}
