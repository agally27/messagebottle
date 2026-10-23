import "server-only";
import { env } from "@/lib/config/env";
import { getProduct } from "@/lib/config/catalogue";
import { getMusicMood, musicDisclosure } from "@/lib/domain/music";
import { parseSongLink } from "@/lib/domain/song";
import { deleteGiftMedia, photosOf } from "./photos";
import { cancelPendingDeliveries } from "./delivery";
import { getStore } from "@/lib/data";
import type { GenerationJob, Gift, GiftInput, PublicGift, Story, UserProfile } from "@/lib/domain/types";
import { giftInputSchema, giftSettingsEditSchema, storyEditSchema } from "@/lib/domain/schemas";
import { createJobRecord, runJob } from "@/lib/jobs/pipeline";
import { kickJob } from "@/lib/jobs/kick";
import { AuthError } from "@/lib/auth/guards";
import { altFor } from "@/lib/story/scenes";
import { isPlausibleToken, newId, newPublicToken, nowIso } from "@/lib/utils/ids";
import type { z } from "zod";

export class RateLimitedError extends Error {
  constructor(public readonly resetAt: number) {
    super("Too many generations. Please wait a little before trying again.");
  }
}

async function audit(action: string, subjectType: "gift" | "order" | "job" | "user" | "system", subjectId: string | null, actorId: string | null, meta: Record<string, string | number | boolean | null> = {}) {
  await getStore().audit.append({ id: newId(), at: nowIso(), actorId, action, subjectType, subjectId, meta });
}

/** Creates a draft gift from validated wizard input. */
export async function createGift(user: UserProfile, rawInput: unknown, opts: { productId?: string | null } = {}): Promise<Gift> {
  const input: GiftInput = giftInputSchema.parse(rawInput);
  const productId = opts.productId && getProduct(opts.productId) ? opts.productId : null;
  const now = nowIso();
  const gift: Gift = {
    id: newId(),
    ownerId: user.id,
    status: "draft",
    input,
    story: null,
    audio: [],
    photos: [],
    publicToken: newPublicToken(),
    productId,
    openCount: 0,
    firstOpenedAt: null,
    lastOpenedAt: null,
    activatedAt: null,
    revokedAt: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await getStore().gifts.create(gift);
  await audit("gift.created", "gift", gift.id, user.id, { occasion: input.occasion, theme: input.theme });
  return gift;
}

/**
 * Starts (or restarts) generation for a gift. Idempotent: an in-flight job is
 * returned rather than duplicated, so retries never double-spend.
 */
export async function startGeneration(user: UserProfile, gift: Gift, opts: { runInline?: boolean } = {}): Promise<GenerationJob> {
  const store = getStore();
  // Never regenerate a finished gift: it would overwrite sender edits and take a live link dark.
  if (gift.status === "ready" || gift.status === "active" || gift.status === "revoked") {
    throw new AuthError(404, "This gift has already been created. Edit it instead of regenerating.");
  }
  const latest = await store.jobs.getLatestForGift(gift.id);
  if (latest && (latest.status === "queued" || latest.status === "running")) {
    if (opts.runInline) await runJob(latest.id);
    else kickJob(latest.id);
    return latest;
  }
  const limit = await store.rateLimit.hit(`gen:${user.id}`, env.GENERATION_RATE_LIMIT_PER_HOUR, 60 * 60 * 1000);
  if (!limit.allowed) throw new RateLimitedError(limit.resetAt);

  const job = createJobRecord(gift);
  await store.jobs.create(job);
  await store.gifts.update(gift.id, { status: "generating" });
  await audit("job.queued", "job", job.id, user.id, { giftId: gift.id, mode: job.mode });
  if (opts.runInline) {
    const done = await runJob(job.id);
    return done ?? job;
  }
  kickJob(job.id);
  return job;
}

/** Status payload for the generation screen. Nudges stale jobs back to life. */
export async function getGenerationStatus(gift: Gift) {
  const store = getStore();
  const job = await store.jobs.getLatestForGift(gift.id);
  if (job && (job.status === "queued" || job.status === "running")) {
    const stale = !job.leaseUntil || job.leaseUntil < nowIso();
    const due = !job.nextRunAt || job.nextRunAt <= nowIso();
    if (stale && due) kickJob(job.id);
  }
  const fresh = await store.gifts.get(gift.id);
  return {
    giftId: gift.id,
    giftStatus: fresh?.status ?? gift.status,
    job: job
      ? {
          id: job.id,
          status: job.status,
          step: job.step,
          completedSteps: job.completedSteps,
          progressMessage: job.progressMessage,
          mode: job.mode,
          attempts: job.attempts,
          lastError: job.lastError ? { code: job.lastError.code, message: job.lastError.message, permanent: job.lastError.permanent } : null,
        }
      : null,
  };
}

export type GenerationStatus = Awaited<ReturnType<typeof getGenerationStatus>>;

/** Sender edits to the generated text. Scene ids must already exist; order must be a permutation. */
export async function applyStoryEdits(gift: Gift, raw: unknown): Promise<Gift> {
  const edits: z.infer<typeof storyEditSchema> = storyEditSchema.parse(raw);
  if (!gift.story) throw new AuthError(404, "This gift has no story yet.");
  const story: Story = { ...gift.story, scenes: gift.story.scenes.map((s) => ({ ...s })) };
  if (edits.title !== undefined) story.title = edits.title;
  if (edits.opening !== undefined) story.opening = edits.opening;
  if (edits.closing !== undefined) story.closing = edits.closing;
  if (edits.dedication !== undefined) story.dedication = edits.dedication;
  for (const e of edits.scenes ?? []) {
    const scene = story.scenes.find((s) => s.id === e.id);
    if (!scene) throw new AuthError(404, "Scene not found.");
    if (e.heading !== undefined) scene.heading = e.heading;
    if (e.text !== undefined) scene.text = e.text;
  }
  if (edits.sceneOrder) {
    const ids = story.scenes.map((s) => s.id);
    const valid = edits.sceneOrder.length === ids.length && [...edits.sceneOrder].sort().join() === [...ids].sort().join();
    if (!valid) throw new AuthError(404, "Scene order is invalid.");
    story.scenes = edits.sceneOrder.map((id, i) => ({ ...story.scenes.find((s) => s.id === id)!, order: i }));
  }
  story.provenance = { ...story.provenance, editedBySender: true };
  const updated = await getStore().gifts.update(gift.id, { story });
  await audit("gift.story_edited", "gift", gift.id, gift.ownerId);
  return updated ?? gift;
}

/** Changes that don't need regeneration: names, theme, music, narration. */
export async function applyGiftSettings(gift: Gift, raw: unknown): Promise<Gift> {
  const parsed = giftSettingsEditSchema.parse(raw);
  // Zod keeps explicit `undefined` keys; never let them erase existing values.
  const edits = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)) as typeof parsed;
  const input: GiftInput = { ...gift.input, ...edits };
  let story = gift.story;
  let audio = gift.audio;
  if (story && edits.theme && edits.theme !== gift.input.theme) {
    story = {
      ...story,
      scenes: story.scenes.map((s) => (s.art.kind === "procedural" ? { ...s, art: { ...s.art, spec: { ...s.art.spec, theme: edits.theme! }, alt: altFor({ ...s.art.spec, theme: edits.theme! }) } } : s)),
    };
  }
  if (edits.music !== undefined && edits.music !== gift.input.music) {
    const others = audio.filter((a) => a.kind !== "music");
    audio = edits.music === "none" ? others : [...others, { kind: "music", source: { type: "procedural", mood: edits.music }, provider: "procedural", label: getMusicMood(edits.music).label, disclosure: musicDisclosure(edits.music) }];
  }
  const updated = await getStore().gifts.update(gift.id, { input, story, audio });
  await audit("gift.settings_edited", "gift", gift.id, gift.ownerId, { keys: Object.keys(edits).join(",") });
  return updated ?? gift;
}

/** Makes the private link live. Called after payment (or demo activation). */
export async function activateGift(gift: Gift, reason: "paid" | "demo"): Promise<Gift> {
  if (gift.status !== "ready" && gift.status !== "active" && gift.status !== "revoked") throw new AuthError(404, "This gift isn't ready to send yet.");
  const updated = await getStore().gifts.update(gift.id, { status: "active", activatedAt: gift.activatedAt ?? nowIso(), revokedAt: null });
  await audit("gift.activated", "gift", gift.id, gift.ownerId, { reason });
  return updated ?? gift;
}

export async function revokeGift(gift: Gift): Promise<Gift> {
  const updated = await getStore().gifts.update(gift.id, { status: "revoked", revokedAt: nowIso() });
  await cancelPendingDeliveries(gift.id);
  await audit("gift.revoked", "gift", gift.id, gift.ownerId);
  return updated ?? gift;
}

/** Rotates the public token (old links stop working) and re-activates. */
export async function regenerateLink(gift: Gift): Promise<Gift> {
  const updated = await getStore().gifts.update(gift.id, { publicToken: newPublicToken(), status: "active", revokedAt: null, activatedAt: gift.activatedAt ?? nowIso() });
  await audit("gift.link_rotated", "gift", gift.id, gift.ownerId);
  return updated ?? gift;
}

export async function deleteGift(gift: Gift): Promise<void> {
  const orders = await getStore().orders.listByGift(gift.id);
  if (orders.some((o) => o.status !== "pending" && o.status !== "cancelled")) {
    throw new AuthError(403, "This gift has a paid order attached. Revoke the link instead, or contact support to remove it.");
  }
  await deleteGiftMedia(gift);
  await getStore().gifts.delete(gift.id);
  await audit("gift.deleted", "gift", gift.id, gift.ownerId);
}

/**
 * The recipient's view. Returns null for unknown, inactive, revoked or expired
 * links. Strips everything that isn't needed to show the gift.
 */
export async function getPublicGift(token: string): Promise<PublicGift | null> {
  if (!isPlausibleToken(token)) return null;
  const gift = await getStore().gifts.getByPublicToken(token);
  if (!gift || !gift.story) return null;
  if (gift.status !== "active") return null;
  if (gift.expiresAt && gift.expiresAt < nowIso()) return null;
  return toPublicGift(gift);
}

/** Counts an open when the recipient taps "Open the bottle" (not on page load, so link previews don't count). */
/**
 * Records that the recipient opened the gift. The sender's own views (e.g.
 * "Open as the recipient" while signed in) are not counted. `firstOpen` is
 * true when this is the first time it was opened.
 */
export async function recordGiftOpen(token: string, opts: { viewerId?: string | null } = {}): Promise<{ counted: boolean; firstOpen: boolean; gift: Gift | null; at: string }> {
  const at = nowIso();
  const none = { counted: false, firstOpen: false, gift: null, at };
  if (!isPlausibleToken(token)) return none;
  const store = getStore();
  const gift = await store.gifts.getByPublicToken(token);
  if (!gift || gift.status !== "active") return none;
  if (opts.viewerId && opts.viewerId === gift.ownerId) return { ...none, gift };
  await store.gifts.recordOpen(gift.id, at);
  return { counted: true, firstOpen: !gift.firstOpenedAt, gift, at };
}

/**
 * Projection with only what the player renders: no prompts, provenance, ids or account data.
 * `preview` (sender's own view) serves photos through the owner-checked route, because the
 * public route only works once the link is active.
 */
export function toPublicGift(gift: Gift, opts: { preview?: boolean } = {}): PublicGift {
  if (!gift.story) throw new Error("gift has no story");
  const song = parseSongLink(gift.input.songUrl ?? "");
  const rememberedName = (gift.input.rememberedName ?? "").trim();
  return {
    token: gift.publicToken,
    recipientName: gift.input.recipientName,
    senderName: gift.input.senderName,
    occasion: gift.input.occasion,
    theme: gift.input.theme,
    story: {
      title: gift.story.title,
      opening: gift.story.opening,
      scenes: [...gift.story.scenes].sort((a, b) => a.order - b.order).map((s) => ({ id: s.id, order: s.order, heading: s.heading, text: s.text, art: s.art })),
      closing: gift.story.closing,
      dedication: gift.story.dedication,
    },
    audio: gift.audio,
    narrationEnabled: gift.input.narration,
    photos: photosOf(gift).map((p) => ({
      id: p.id,
      url: opts.preview ? `/api/gifts/${gift.id}/photos/${p.id}` : `/api/g/${gift.publicToken}/photos/${p.id}`,
      caption: p.caption,
      year: p.year,
      width: p.width,
      height: p.height,
    })),
    song: song ? { provider: song.provider, providerName: song.providerName, url: song.url, embedUrl: song.embedUrl } : null,
    inMemoryOf: rememberedName ? { name: rememberedName, dates: (gift.input.rememberedDates ?? "").trim() } : null,
  };
}

export { publicGiftUrl } from "./links";
