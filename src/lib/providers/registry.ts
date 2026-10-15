import "server-only";
import { env } from "@/lib/config/env";
import { LocalStoryProvider } from "@/lib/story/local-writer";
import { ProceduralImageProvider } from "./image/procedural";
import { ProceduralMusicProvider } from "./music/procedural";
import { NoNarrationProvider } from "./narration/none";
import type { ImageProvider, MusicProvider, NarrationProvider, StoryProvider } from "./types";

export interface ProviderSet {
  story: StoryProvider;
  image: ImageProvider;
  music: MusicProvider;
  narration: NarrationProvider;
}

let cached: ProviderSet | null = null;

/** Providers selected from the environment. Local/procedural ones always work. */
export function getProviders(): ProviderSet {
  if (cached) return cached;
  cached = {
    story: env.storyProvider === "anthropic" ? createAnthropicStoryProvider() : new LocalStoryProvider(),
    image: env.imageProvider === "openai" ? createOpenAiImageProvider() : new ProceduralImageProvider(),
    music: new ProceduralMusicProvider(),
    narration: env.narrationProvider === "elevenlabs" ? createElevenLabsNarrationProvider() : new NoNarrationProvider(),
  };
  return cached;
}

/** Test seam. */
export function setProvidersForTests(set: ProviderSet | null) {
  cached = set;
}

export function providersAreLive(set: ProviderSet = getProviders()): boolean {
  return set.story.live || set.image.live || set.music.live || set.narration.live;
}

function createAnthropicStoryProvider(): StoryProvider {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("./story/anthropic") as typeof import("./story/anthropic");
  return new mod.AnthropicStoryProvider();
}

function createOpenAiImageProvider(): ImageProvider {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("./image/openai") as typeof import("./image/openai");
  return new mod.OpenAiImageProvider();
}

function createElevenLabsNarrationProvider(): NarrationProvider {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("./narration/elevenlabs") as typeof import("./narration/elevenlabs");
  return new mod.ElevenLabsNarrationProvider();
}
