import { beforeEach, describe, expect, it } from "vitest";
import { LocalStore } from "@/lib/data/local-store";
import type { GiftInput, UserProfile } from "@/lib/domain/types";
import { createGift, getPublicGift, startGeneration, applyStoryEdits, revokeGift, activateGift } from "@/lib/gifts/service";
import { LocalStoryProvider } from "@/lib/story/local-writer";
import { ProceduralImageProvider } from "@/lib/providers/image/procedural";
import { ProceduralMusicProvider } from "@/lib/providers/music/procedural";
import { NoNarrationProvider } from "@/lib/providers/narration/none";
import { setProvidersForTests, type ProviderSet } from "@/lib/providers/registry";
import { ProviderError, type StoryProvider, type StoryResult } from "@/lib/providers/types";
import { runJob } from "./pipeline";
import { getStore } from "@/lib/data";

const user: UserProfile = { id: "user-1", email: null, displayName: "Tom", isAdmin: false, kind: "demo", createdAt: "", updatedAt: "" };
const other: UserProfile = { ...user, id: "user-2" };

const input: GiftInput = {
  occasion: "birthday",
  customOccasion: "",
  recipientName: "Maya",
  relationship: "my sister",
  pronouns: "she",
  ageRange: "adult",
  recipientContext: "",
  senderName: "Tom",
  message: "Happy birthday, Maya. You have always been the brave one. I watched you move cities, start again, and make it look easy. It wasn't easy. I'm so proud of you. Here's to the next year.",
  memories: "",
  datesAndPlaces: "",
  tone: "celebratory",
  transformation: "story",
  theme: "storybook",
  music: "celebratory",
  narration: false, songUrl: "", rememberedName: "", rememberedDates: "",
};

function localProviders(story: StoryProvider = new LocalStoryProvider()): ProviderSet {
  return { story, image: new ProceduralImageProvider(), music: new ProceduralMusicProvider(), narration: new NoNarrationProvider() };
}

class FlakyStory implements StoryProvider {
  readonly id = "flaky";
  readonly live = true;
  calls = 0;
  constructor(private failures: number, private permanent = false) {}
  async write(): Promise<StoryResult> {
    this.calls += 1;
    if (this.calls <= this.failures) throw new ProviderError("upstream down", this.permanent ? "auth" : "upstream_error", this.permanent);
    // Reuse the local writer for a faithful draft.
    const local = await new LocalStoryProvider().write((await import("@/lib/story/brief")).buildBrief(input));
    return { ...local, provider: this.id, model: "test-model", usage: { provider: this.id, kind: "story", units: 1, unitLabel: "call", estimatedCostMinor: 2 } };
  }
}

describe("generation pipeline", () => {
  beforeEach(async () => {
    const store = getStore() as LocalStore;
    await store.reset();
    setProvidersForTests(localProviders());
  });

  it("runs every step and marks the gift ready (demo mode)", async () => {
    const gift = await createGift(user, input);
    const job = await startGeneration(user, gift, { runInline: true });
    expect(job.status).toBe("succeeded");
    expect(job.mode).toBe("demo");
    expect(job.completedSteps).toEqual(["brief", "story", "scenes", "images", "audio", "assemble"]);
    const fresh = await getStore().gifts.get(gift.id);
    expect(fresh?.status).toBe("ready");
    expect(fresh?.story?.scenes.length).toBeGreaterThanOrEqual(2);
    expect(fresh?.audio.find((a) => a.kind === "music")?.source).toEqual({ type: "procedural", mood: "celebratory" });
    expect(JSON.stringify(fresh?.story)).toContain("Maya");
  });

  it("does not create a duplicate job while one is in flight", async () => {
    const gift = await createGift(user, input);
    const store = getStore();
    const first = await startGeneration(user, gift);
    // Simulate a second request arriving while the first is still queued/leased.
    await store.jobs.update(first.id, { status: "running", leaseUntil: new Date(Date.now() + 60_000).toISOString() });
    const second = await startGeneration(user, gift);
    expect(second.id).toBe(first.id);
    expect((await store.jobs.listRecent(10)).length).toBe(1);
  });

  it("retries transient provider errors with backoff and then succeeds", async () => {
    const flaky = new FlakyStory(1);
    setProvidersForTests(localProviders(flaky));
    const gift = await createGift(user, input);
    const job = await startGeneration(user, gift, { runInline: true });
    expect(job.status).toBe("queued");
    expect(job.attempts).toBe(1);
    expect(job.lastError?.code).toBe("upstream_error");
    expect(job.nextRunAt).not.toBeNull();
    // Not due yet: claim refuses.
    expect(await runJob(job.id)).toMatchObject({ status: "queued" });
    // Make it due and run again.
    await getStore().jobs.update(job.id, { nextRunAt: new Date(Date.now() - 1000).toISOString() });
    const done = await runJob(job.id);
    expect(done?.status).toBe("succeeded");
    expect(done?.mode).toBe("live");
    expect(flaky.calls).toBe(2);
    expect(done?.usage.map((u) => u.provider)).toEqual(["flaky"]);
    expect((await getStore().gifts.get(gift.id))?.story?.provenance.model).toBe("test-model");
  });

  it("falls back to the local writer on a permanent provider error instead of failing the gift", async () => {
    setProvidersForTests(localProviders(new FlakyStory(99, true)));
    const gift = await createGift(user, input);
    const job = await startGeneration(user, gift, { runInline: true });
    expect(job.status).toBe("succeeded");
    expect((await getStore().gifts.get(gift.id))?.story?.provenance.provider).toBe("local");
  });

  it("fails permanently after max attempts and keeps the sender's input", async () => {
    setProvidersForTests(localProviders(new FlakyStory(99)));
    const gift = await createGift(user, input);
    let job = await startGeneration(user, gift, { runInline: true });
    for (let i = 0; i < 5 && job.status === "queued"; i++) {
      await getStore().jobs.update(job.id, { nextRunAt: new Date(Date.now() - 1000).toISOString() });
      job = (await runJob(job.id))!;
    }
    expect(job.status).toBe("failed");
    expect(job.attempts).toBe(3);
    const fresh = await getStore().gifts.get(gift.id);
    expect(fresh?.status).toBe("failed");
    expect(fresh?.input.message).toBe(input.message);
    // A retry after failure creates a new job rather than reviving the dead one.
    setProvidersForTests(localProviders());
    const retry = await startGeneration(user, gift, { runInline: true });
    expect(retry.id).not.toBe(job.id);
    expect(retry.status).toBe("succeeded");
  });

  it("enforces the per-sender generation rate limit", async () => {
    const limit = 5;
    for (let i = 0; i < limit; i++) {
      const gift = await createGift(user, input);
      await startGeneration(user, gift, { runInline: true });
    }
    const gift = await createGift(user, input);
    await expect(startGeneration(user, gift, { runInline: true })).rejects.toThrow(/Too many generations/);
  });
});

describe("public access", () => {
  beforeEach(async () => {
    await (getStore() as LocalStore).reset();
    setProvidersForTests(localProviders());
  });

  it("exposes a gift only when active, and never exposes owner data", async () => {
    const gift = await createGift(user, input);
    await startGeneration(user, gift, { runInline: true });
    const ready = (await getStore().gifts.get(gift.id))!;
    expect(await getPublicGift(ready.publicToken)).toBeNull(); // ready but not activated
    await activateGift(ready, "demo");
    const pub = await getPublicGift(ready.publicToken);
    expect(pub?.recipientName).toBe("Maya");
    expect(JSON.stringify(pub)).not.toContain(user.id);
    expect(JSON.stringify(pub)).not.toContain(gift.id);
    const { recordGiftOpen } = await import("@/lib/gifts/service");
    expect(await recordGiftOpen(ready.publicToken)).toBe(true);
    expect((await getStore().gifts.get(gift.id))?.openCount).toBe(1);
    await revokeGift(ready);
    expect(await getPublicGift(ready.publicToken)).toBeNull();
  });

  it("rejects malformed or unknown tokens", async () => {
    expect(await getPublicGift("short")).toBeNull();
    expect(await getPublicGift("a".repeat(43))).toBeNull();
    expect(await getPublicGift("../../etc/passwd")).toBeNull();
  });

  it("validates story edits: unknown scene ids and bad orderings are refused", async () => {
    const gift = await createGift(user, input);
    await startGeneration(user, gift, { runInline: true });
    const ready = (await getStore().gifts.get(gift.id))!;
    await expect(applyStoryEdits(ready, { scenes: [{ id: "nope", text: "x" }] })).rejects.toThrow(/Scene not found/);
    await expect(applyStoryEdits(ready, { sceneOrder: ["scene-1"] })).rejects.toThrow(/invalid/);
    const ids = ready.story!.scenes.map((s) => s.id);
    const edited = await applyStoryEdits(ready, { title: "A new title", sceneOrder: [...ids].reverse() });
    expect(edited.story?.title).toBe("A new title");
    expect(edited.story?.scenes[0]?.id).toBe(ids[ids.length - 1]);
    expect(edited.story?.provenance.editedBySender).toBe(true);
  });

  it("never regenerates a finished gift, and refuses to delete one with a paid order", async () => {
    const gift = await createGift(user, input);
    await startGeneration(user, gift, { runInline: true });
    const ready = (await getStore().gifts.get(gift.id))!;
    await expect(startGeneration(user, ready, { runInline: true })).rejects.toThrow(/already been created/);
    const { createPendingOrder, markOrderPaid } = await import("@/lib/orders/service");
    const { deleteGift } = await import("@/lib/gifts/service");
    const order = await createPendingOrder(user, ready, { productId: "digital" });
    await markOrderPaid(order.id, { provider: "demo", amountMinor: 499, currency: "GBP" });
    await expect(deleteGift(ready)).rejects.toThrow(/paid order/);
    expect(await getStore().gifts.get(gift.id)).not.toBeNull();
  });

  it("public projection omits prompts, provenance and anything about the account", async () => {
    const gift = await createGift(user, input);
    await startGeneration(user, gift, { runInline: true });
    const ready = (await getStore().gifts.get(gift.id))!;
    await activateGift(ready, "demo");
    const pub = (await getPublicGift(ready.publicToken))!;
    const json = JSON.stringify(pub);
    expect(json).not.toContain("artPrompt");
    expect(json).not.toContain("provenance");
    expect(json).not.toContain("ownerId");
    expect(pub.story.scenes.map((s) => s.order)).toEqual(pub.story.scenes.map((_, i) => i));
  });

  it("settings edits with explicit undefined never erase existing values", async () => {
    const gift = await createGift(user, input);
    await startGeneration(user, gift, { runInline: true });
    const ready = (await getStore().gifts.get(gift.id))!;
    const { applyGiftSettings } = await import("@/lib/gifts/service");
    const edited = await applyGiftSettings(ready, { recipientName: undefined, theme: "ocean" });
    expect(edited.input.recipientName).toBe("Maya");
    expect(edited.input.theme).toBe("ocean");
  });

  it("ownership is enforced by id and owner, not by id alone", async () => {
    const gift = await createGift(user, input);
    const { requireOwnedGift } = await import("@/lib/auth/guards");
    await expect(requireOwnedGift(gift.id, other)).rejects.toThrow(/not found/i);
    await expect(requireOwnedGift(gift.id, user)).resolves.toMatchObject({ id: gift.id });
  });
});

describe("retention sweep", () => {
  it("removes old drafts and failed gifts but never finished ones", async () => {
    await (getStore() as LocalStore).reset();
    setProvidersForTests(localProviders());
    const store = getStore();
    const old = new Date(Date.now() - 100 * 24 * 3600 * 1000).toISOString();
    const draft = await createGift(user, input);
    await store.gifts.update(draft.id, { status: "draft" });
    const ready = await createGift(user, input);
    await startGeneration(user, ready, { runInline: true });
    // Backdate both.
    const { sweepAbandonedGifts } = await import("./pipeline");
    (store as LocalStore)["db"].gifts[draft.id]!.updatedAt = old;
    (store as LocalStore)["db"].gifts[ready.id]!.updatedAt = old;
    const removed = await sweepAbandonedGifts(90);
    expect(removed).toEqual([draft.id]);
    expect(await store.gifts.get(ready.id)).not.toBeNull();
  });
});
