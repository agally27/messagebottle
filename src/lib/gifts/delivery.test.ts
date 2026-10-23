import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Email must look configured before env.ts loads (each test file gets fresh modules).
vi.hoisted(() => {
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.EMAIL_FROM = "Message in a Bottle <hello@example.test>";
});

import { LocalStore } from "@/lib/data/local-store";
import { getStore } from "@/lib/data";
import type { GiftInput, UserProfile } from "@/lib/domain/types";
import { activateGift, createGift, deleteGift, revokeGift, startGeneration } from "./service";
import { addDays, cancelDelivery, deliveryWindow, processDueDeliveries, scheduleDelivery, sendAtFor, ukToday } from "./delivery";
import { setProvidersForTests } from "@/lib/providers/registry";
import { LocalStoryProvider } from "@/lib/story/local-writer";
import { ProceduralImageProvider } from "@/lib/providers/image/procedural";
import { ProceduralMusicProvider } from "@/lib/providers/music/procedural";
import { NoNarrationProvider } from "@/lib/providers/narration/none";

const guest: UserProfile = { id: "guest-1", email: null, displayName: "Tom", isAdmin: false, kind: "demo", createdAt: "", updatedAt: "" };
const member: UserProfile = { ...guest, id: "member-1", kind: "supabase", email: "tom@example.test" };
const input: GiftInput = { occasion: "birthday", customOccasion: "", recipientName: "Maya", relationship: "my sister", pronouns: "she", ageRange: "adult", recipientContext: "", senderName: "Tom", message: "Happy birthday, Maya. You have always been the brave one, and I am so proud of you.", memories: "", datesAndPlaces: "", tone: "celebratory", transformation: "story", theme: "storybook", music: "piano", narration: false, songUrl: "", rememberedName: "", rememberedDates: "" };

// 23 Oct 2026, 10:00 UK time (BST).
const NOW = new Date("2026-10-23T09:00:00Z");

async function liveGift(owner: UserProfile = member) {
  const gift = await createGift(owner, input);
  await startGeneration(owner, gift, { runInline: true });
  return activateGift((await getStore().gifts.get(gift.id))!, "demo");
}

type Sent = { url: string; body: { to: string[]; subject: string; html: string; text: string } };
let sent: Sent[] = [];
let failNext = 0;

describe("scheduled delivery", () => {
  beforeEach(async () => {
    await (getStore() as LocalStore).reset();
    setProvidersForTests({ story: new LocalStoryProvider(), image: new ProceduralImageProvider(), music: new ProceduralMusicProvider(), narration: new NoNarrationProvider() });
    sent = [];
    failNext = 0;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      if (failNext > 0) {
        failNext--;
        return new Response("upstream error", { status: 503 });
      }
      sent.push({ url, body: JSON.parse(String(init.body)) });
      return Response.json({ id: `re_${sent.length}` });
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("works in UK dates: tomorrow at the earliest, due at 07:00 UTC (by 9am UK time all year)", () => {
    expect(ukToday(new Date("2026-10-24T23:30:00Z"))).toBe("2026-10-25"); // 00:30 BST
    expect(ukToday(new Date("2026-12-31T23:30:00Z"))).toBe("2026-12-31"); // GMT
    expect(deliveryWindow(NOW)).toEqual({ min: "2026-10-24", max: addDays("2026-10-23", 366) });
    expect(sendAtFor("2026-12-25")).toBe("2026-12-25T07:00:00.000Z");
  });

  it("validates the request and only lets paid gifts, real accounts or operators email someone", async () => {
    const gift = await liveGift();
    await expect(scheduleDelivery(member, gift, { to: "not-an-email", sendOn: "2026-12-25" }, NOW)).rejects.toThrow(/valid email/);
    await expect(scheduleDelivery(member, gift, { to: "maya@example.test", sendOn: "2026-10-23" }, NOW)).rejects.toThrow(/tomorrow or later/);
    await expect(scheduleDelivery(member, gift, { to: "maya@example.test", sendOn: "2026-02-30" }, NOW)).rejects.toThrow(/choose a date/i);
    await expect(scheduleDelivery(member, gift, { to: "maya@example.test", sendOn: "2028-01-01" }, NOW)).rejects.toThrow(/next year/);

    const guestGift = await liveGift(guest); // demo-activated, not paid through Stripe
    await expect(scheduleDelivery(guest, guestGift, { to: "maya@example.test", sendOn: "2026-12-25" }, NOW)).rejects.toThrow(/paid gifts/);

    const draft = await createGift(member, input);
    await expect(scheduleDelivery(member, draft, { to: "maya@example.test", sendOn: "2026-12-25" }, NOW)).rejects.toThrow(/Activate/);
  });

  it("sends on the day, once, with the live link — and a new date replaces the old one", async () => {
    const gift = await liveGift();
    const first = await scheduleDelivery(member, gift, { to: "Maya@Example.test", sendOn: "2026-12-24" }, NOW);
    const second = await scheduleDelivery(member, gift, { to: "maya@example.test", sendOn: "2026-12-25", note: "Merry Christmas" }, NOW);
    expect((await getStore().deliveries.get(first.id))?.status).toBe("cancelled");

    expect(await processDueDeliveries(new Date("2026-12-25T06:59:00Z"))).toEqual({ sent: 0, failed: 0 }); // not yet
    expect(await processDueDeliveries(new Date("2026-12-25T07:20:00Z"))).toEqual({ sent: 1, failed: 0 });
    expect(await processDueDeliveries(new Date("2026-12-25T07:40:00Z"))).toEqual({ sent: 0, failed: 0 }); // never twice

    expect(sent).toHaveLength(1);
    expect(sent[0]!.url).toBe("https://api.resend.com/emails");
    expect(sent[0]!.body.to).toEqual(["maya@example.test"]);
    expect(sent[0]!.body.subject).toBe("Tom has a message for you");
    expect(sent[0]!.body.html).toContain(`/g/${gift.publicToken}`);
    expect(sent[0]!.body.html).toContain("Merry Christmas");
    const done = (await getStore().deliveries.get(second.id))!;
    expect(done).toMatchObject({ status: "sent", attempts: 1, lastError: null });
    expect(done.sentAt).not.toBeNull();
  });

  it("two overlapping runs still send only once", async () => {
    const gift = await liveGift();
    await scheduleDelivery(member, gift, { to: "maya@example.test", sendOn: "2026-12-25" }, NOW);
    const at = new Date("2026-12-25T07:05:00Z");
    const [a, b] = await Promise.all([processDueDeliveries(at), processDueDeliveries(at)]);
    expect(a.sent + b.sent).toBe(1);
    expect(sent).toHaveLength(1);
  });

  it("retries once straight away, then reports the failure to the sender", async () => {
    const gift = await liveGift();
    const ok = await scheduleDelivery(member, gift, { to: "maya@example.test", sendOn: "2026-12-25" }, NOW);
    failNext = 1;
    expect(await processDueDeliveries(new Date("2026-12-25T07:05:00Z"))).toEqual({ sent: 1, failed: 0 });
    expect((await getStore().deliveries.get(ok.id))?.attempts).toBe(2);

    const gift2 = await liveGift();
    const bad = await scheduleDelivery(member, gift2, { to: "sam@example.test", sendOn: "2026-12-26" }, NOW);
    failNext = 2;
    expect(await processDueDeliveries(new Date("2026-12-26T07:05:00Z"))).toEqual({ sent: 0, failed: 1 });
    expect(await getStore().deliveries.get(bad.id)).toMatchObject({ status: "failed", attempts: 2, lastError: expect.stringMatching(/didn't accept/) });
  });

  it("never sends a link that isn't live: revoking cancels, and cancelled ones stay cancelled", async () => {
    const gift = await liveGift();
    const d = await scheduleDelivery(member, gift, { to: "maya@example.test", sendOn: "2026-12-25" }, NOW);
    await revokeGift(gift);
    expect((await getStore().deliveries.get(d.id))?.status).toBe("cancelled");

    const gift2 = await liveGift();
    const d2 = await scheduleDelivery(member, gift2, { to: "maya@example.test", sendOn: "2026-12-25" }, NOW);
    await cancelDelivery(member, gift2, d2.id);
    await expect(cancelDelivery(member, gift2, d2.id)).rejects.toThrow(/isn't scheduled/);
    await expect(cancelDelivery(member, gift, d2.id)).rejects.toThrow(/wasn't found/); // another gift's delivery

    // Link turned off by other means (e.g. expiry) between scheduling and the day.
    const gift3 = await liveGift();
    const d3 = await scheduleDelivery(member, gift3, { to: "maya@example.test", sendOn: "2026-12-25" }, NOW);
    await getStore().gifts.update(gift3.id, { expiresAt: "2026-12-01T00:00:00.000Z" });
    expect(await processDueDeliveries(new Date("2026-12-25T07:05:00Z"))).toEqual({ sent: 0, failed: 1 });
    expect((await getStore().deliveries.get(d3.id))?.lastError).toMatch(/wasn't live/);
    expect(sent).toHaveLength(0);
  });

  it("deleting the gift removes its deliveries (and the recipient's address with them)", async () => {
    const gift = await liveGift();
    const d = await scheduleDelivery(member, gift, { to: "maya@example.test", sendOn: "2026-12-25" }, NOW);
    await deleteGift((await getStore().gifts.get(gift.id))!);
    expect(await getStore().deliveries.get(d.id)).toBeNull();
  });
});
