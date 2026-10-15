import "server-only";
import { env } from "@/lib/config/env";
import { getStore } from "@/lib/data";
import { getMusicMood } from "@/lib/domain/music";
import { giftInputSchema } from "@/lib/domain/schemas";
import { getTheme } from "@/lib/domain/themes";
import { JOB_STEPS, type AudioAsset, type GenerationJob, type Gift, type JobError, type JobStep, type JobUsage, type Story } from "@/lib/domain/types";
import { getProviders, providersAreLive, type ProviderSet } from "@/lib/providers/registry";
import { ProviderError, storyDraftSchema } from "@/lib/providers/types";
import { buildBrief } from "@/lib/story/brief";
import { writeLocalStory } from "@/lib/story/local-writer";
import { checkStory } from "@/lib/story/quality";
import { altFor, assignScenes } from "@/lib/story/scenes";
import { newId, nowIso } from "@/lib/utils/ids";

export const STEP_LABELS: Record<JobStep, string> = {
  brief: "Preparing the personal story",
  story: "Writing the story from your words",
  scenes: "Creating the illustrated scenes",
  images: "Rendering the artwork",
  audio: "Preparing the soundtrack",
  assemble: "Assembling the experience",
};

const LEASE_MS = 2 * 60 * 1000;
const STEP_TIMEOUT_MS = 90 * 1000;
const MAX_ATTEMPTS = 3;

export function createJobRecord(gift: Gift, providers: ProviderSet = getProviders()): GenerationJob {
  const now = nowIso();
  return {
    id: newId(),
    giftId: gift.id,
    ownerId: gift.ownerId,
    status: "queued",
    step: "brief",
    completedSteps: [],
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    leaseUntil: null,
    nextRunAt: null,
    lastError: null,
    usage: [],
    progressMessage: "Waiting to start",
    mode: providersAreLive(providers) ? "live" : "demo",
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
}

function backoffMs(attempt: number): number {
  return Math.min(60_000, 2_000 * 2 ** (attempt - 1));
}

function toJobError(err: unknown): JobError {
  if (err instanceof ProviderError) return { code: err.code, message: err.message, permanent: err.permanent, at: nowIso() };
  if (err instanceof Error && err.name === "AbortError") return { code: "timeout", message: "The step took too long", permanent: false, at: nowIso() };
  return { code: "unexpected", message: err instanceof Error ? err.message : "Unexpected error", permanent: false, at: nowIso() };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

interface StepContext {
  job: GenerationJob;
  gift: Gift;
  providers: ProviderSet;
  usage: JobUsage[];
}

type StepFn = (ctx: StepContext, signal: AbortSignal) => Promise<Partial<Gift> | void>;

const steps: Record<JobStep, StepFn> = {
  async brief({ gift }) {
    const parsed = giftInputSchema.safeParse(gift.input);
    if (!parsed.success) throw new ProviderError("The gift details are incomplete", "invalid_input", true);
  },

  async story({ gift, providers, usage }, signal) {
    const brief = buildBrief(gift.input);
    let draft;
    let provider = providers.story.id;
    let model: string | undefined;
    try {
      const result = await providers.story.write(brief, gift.input, signal);
      const validated = storyDraftSchema.safeParse(result.draft);
      if (!validated.success) throw new ProviderError("The story came back in an unexpected shape", "invalid_output", false);
      const report = checkStory(brief, validated.data);
      if (!report.ok && providers.story.live) {
        // Model drifted from the sender's words: fall back to the faithful local writer.
        console.warn("[jobs] story quality check failed; using local writer", { giftId: gift.id, issues: report.issues });
        draft = writeLocalStory(brief);
        provider = "local";
      } else {
        draft = validated.data;
        model = result.model;
      }
      if (result.usage) usage.push(result.usage);
    } catch (err) {
      if (!providers.story.live) throw err;
      const e = toJobError(err);
      if (!e.permanent) throw err; // transient: let the runner retry the model
      console.warn("[jobs] story provider failed permanently; using local writer", { giftId: gift.id, code: e.code });
      draft = writeLocalStory(brief);
      provider = "local";
    }
    const story: Story = {
      version: 1,
      title: draft.title,
      opening: draft.opening,
      scenes: assignScenes(gift.id, draft, gift.input.theme, gift.input.occasion),
      closing: draft.closing,
      dedication: draft.dedication,
      provenance: { provider, model, generatedAt: nowIso(), editedBySender: false },
    };
    return { story };
  },

  async scenes({ gift }) {
    if (!gift.story) throw new ProviderError("Story missing before scenes", "invalid_state", true);
    // Re-derive art specs for any scene missing one (idempotent; keeps real images).
    const theme = gift.input.theme;
    const scenes = gift.story.scenes.map((s, i) => {
      if (s.art.kind === "image") return s;
      if (s.art.kind === "procedural" && s.art.spec.theme === theme) return { ...s, art: { ...s.art, alt: altFor(s.art.spec) } };
      const spec = { ...s.art.spec, theme };
      return { ...s, order: i, art: { kind: "procedural" as const, spec, alt: altFor(spec) } };
    });
    return { story: { ...gift.story, scenes } };
  },

  async images({ gift, providers, usage }, signal) {
    if (!gift.story) throw new ProviderError("Story missing before images", "invalid_state", true);
    if (!providers.image.live) return;
    const artDirection = getTheme(gift.input.theme).artDirection;
    const scenes = [...gift.story.scenes];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]!;
      if (scene.art.kind === "image") continue; // already done on a previous attempt
      const result = await providers.image.generate({ giftId: gift.id, scene, spec: scene.art.spec, artDirection }, signal);
      if (!result) continue;
      if (result.usage) usage.push(result.usage);
      scenes[i] = { ...scene, art: { kind: "image", assetId: result.assetId, url: result.url, alt: result.alt, width: result.width, height: result.height } };
    }
    return { story: { ...gift.story, scenes } };
  },

  async audio({ gift, providers, usage }, signal) {
    if (!gift.story) throw new ProviderError("Story missing before audio", "invalid_state", true);
    const audio: AudioAsset[] = [];
    const mood = getMusicMood(gift.input.music);
    const music = await providers.music.compose(gift.input.music, mood.prompt, gift.id, signal);
    if (music) {
      audio.push({ kind: "music", source: music.source, provider: providers.music.id, label: music.label, disclosure: music.disclosure });
      if (music.usage) usage.push(music.usage);
    }
    if (gift.input.narration && providers.narration.live) {
      try {
        const narration = await providers.narration.narrate(gift.story, gift.id, signal);
        if (narration) {
          audio.push({ kind: "narration", source: { type: "url", url: narration.url, assetId: narration.assetId, durationMs: narration.durationMs }, provider: providers.narration.id, label: "Narration" });
          if (narration.usage) usage.push(narration.usage);
        }
      } catch (err) {
        // Narration is optional: never fail the gift because of it.
        console.warn("[jobs] narration failed; continuing without it", { giftId: gift.id, code: toJobError(err).code });
      }
    }
    return { audio };
  },

  async assemble({ gift }) {
    if (!gift.story) throw new ProviderError("Story missing at assembly", "invalid_state", true);
    const report = checkStory(buildBrief(gift.input), { title: gift.story.title, opening: gift.story.opening, scenes: gift.story.scenes.map((s) => ({ heading: s.heading, text: s.text, artPrompt: s.artPrompt })), closing: gift.story.closing, dedication: gift.story.dedication });
    if (!report.ok && !gift.story.provenance.editedBySender) {
      throw new ProviderError(`Story failed final checks: ${report.issues.join("; ")}`, "quality", false);
    }
    return { status: "ready" as const };
  },
};

/**
 * Runs one job to completion (or to its next retry point). Safe to call from
 * several places: a lease prevents concurrent execution, completed steps are
 * never re-run, and gift state is persisted after every step.
 */
export async function runJob(jobId: string, providers: ProviderSet = getProviders()): Promise<GenerationJob | null> {
  const store = getStore();
  const now = nowIso();
  const leaseUntil = new Date(Date.now() + LEASE_MS).toISOString();
  const claimed = await store.jobs.claim(jobId, leaseUntil, now);
  if (!claimed) return store.jobs.get(jobId);
  let job: GenerationJob = claimed;

  const gift = await store.gifts.get(job.giftId);
  if (!gift) {
    return store.jobs.update(job.id, { status: "failed", leaseUntil: null, finishedAt: nowIso(), lastError: { code: "missing_gift", message: "Gift no longer exists", permanent: true, at: nowIso() } });
  }
  if (gift.status !== "generating") {
    await store.gifts.update(gift.id, { status: "generating" });
  }

  let current: Gift = { ...gift, status: "generating" };
  const usage: JobUsage[] = [...job.usage];
  const startIndex = JOB_STEPS.indexOf(job.step);

  for (let i = Math.max(0, startIndex); i < JOB_STEPS.length; i++) {
    const step = JOB_STEPS[i]!;
    if (job.completedSteps.includes(step)) continue;
    job = (await store.jobs.update(job.id, { step, progressMessage: STEP_LABELS[step], leaseUntil: new Date(Date.now() + LEASE_MS).toISOString() })) ?? job;
    try {
      const patch = await withTimeout((signal) => steps[step]({ job, gift: current, providers, usage }, signal), STEP_TIMEOUT_MS);
      if (patch) {
        const updated = await store.gifts.update(current.id, patch);
        if (updated) current = updated;
      }
      job = (await store.jobs.update(job.id, { completedSteps: [...job.completedSteps, step], usage, lastError: null })) ?? job;
      if (job.mode === "demo" && env.DEMO_STEP_DELAY_MS > 0 && env.NODE_ENV !== "test") await sleep(env.DEMO_STEP_DELAY_MS);
    } catch (err) {
      const error = toJobError(err);
      const attempts = job.attempts + 1;
      const exhausted = error.permanent || attempts >= job.maxAttempts;
      console.warn("[jobs] step failed", { jobId: job.id, step, code: error.code, permanent: error.permanent, attempts, exhausted });
      if (exhausted) {
        await store.gifts.update(current.id, { status: "failed" });
        await store.audit.append({ id: newId(), at: nowIso(), actorId: null, action: "job.failed", subjectType: "job", subjectId: job.id, meta: { giftId: current.id, step, code: error.code } });
        return store.jobs.update(job.id, { status: "failed", attempts, lastError: error, leaseUntil: null, finishedAt: nowIso(), usage, progressMessage: "Something went wrong" });
      }
      return store.jobs.update(job.id, {
        status: "queued",
        attempts,
        lastError: error,
        leaseUntil: null,
        nextRunAt: new Date(Date.now() + backoffMs(attempts)).toISOString(),
        usage,
        progressMessage: "Retrying shortly",
      });
    }
  }

  await store.audit.append({ id: newId(), at: nowIso(), actorId: null, action: "job.succeeded", subjectType: "job", subjectId: job.id, meta: { giftId: current.id, mode: job.mode, estimatedCostMinor: usage.reduce((a, u) => a + u.estimatedCostMinor, 0) } });
  return store.jobs.update(job.id, { status: "succeeded", leaseUntil: null, nextRunAt: null, finishedAt: nowIso(), progressMessage: "Your gift is ready", usage });
}

/**
 * Retention: removes drafts and failed gifts untouched for `days` (default 90),
 * as promised in the privacy notice. Never touches ready/active/revoked gifts.
 */
export async function sweepAbandonedGifts(days = 90, limit = 100): Promise<string[]> {
  const store = getStore();
  const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const abandoned = await store.gifts.listAbandoned(before, limit);
  const removed: string[] = [];
  for (const gift of abandoned) {
    if (await store.gifts.delete(gift.id)) {
      removed.push(gift.id);
      await store.audit.append({ id: newId(), at: nowIso(), actorId: null, action: "gift.retention_deleted", subjectType: "gift", subjectId: gift.id, meta: { status: gift.status } });
    }
  }
  return removed;
}

/** Processes any due jobs (used by the cron endpoint and as a safety net). */
export async function processDueJobs(limit = 5): Promise<string[]> {
  const store = getStore();
  const due = await store.jobs.listDue(nowIso(), limit);
  const ran: string[] = [];
  for (const job of due) {
    await runJob(job.id);
    ran.push(job.id);
  }
  return ran;
}
