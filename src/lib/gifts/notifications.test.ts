import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.RESEND_API_KEY = "re_test_key";
});

import { LocalStore } from "@/lib/data/local-store";
import { getStore } from "@/lib/data";
import type { GiftInput, UserProfile } from "@/lib/domain/types";
import { activateGift, createGift, recordGiftOpen, startGeneration } from "./service";
import { notifyGiftOpened, openNoticePanel } from "./notifications";
import { setProvidersForTests } from "@/lib/providers/registry";
import { LocalStoryProvider } from "@/lib/story/local-writer";
import { ProceduralImageProvider } from "@/lib/providers/image/procedural";
import { ProceduralMusicProvider } from "@/lib/providers/music/procedural";
import { NoNarrationProvider } from "@/lib/providers/narration/none";

const member: UserProfile = { id: "member-1", email: "tom@example.test", displayName: "Tom", isAdmin: false, kind: "supabase", createdAt: "", updatedAt: "" };
const guest: UserProfile = { ...member, id: "guest-1", email: null, kind: "demo" };
const MESSAGE = "Happy birthday, Maya. You have always been the brave one, and I am so proud of you.";
const input: GiftInput = { occasion: "birthday", customOccasion: "", recipientName: "Maya", relationship: "my sister", pronouns: "she", ageRange: "adult", recipientContext: "", senderName: "Tom", message: MESSAGE, memories: "", datesAndPlaces: "", tone: "celebratory", transformation: "story", theme: "storybook", music: "piano", narration: false, songUrl: "", rememberedName: "", rememberedDates: "" };

let sent: Array<{ to: string[]; subject: string; html: string; text: string }> = [];

async function liveGift(owner: UserProfile = member) {
  await getStore().users.upsert(owner);
  const gift = await createGift(owner, input);
  await startGeneration(owner, gift, { runInline: true });
  return activateGift((await getStore().gifts.get(gift.id))!, "demo");
}

describe("opened notification", () => {
  beforeEach(async () => {
    await (getStore() as LocalStore).reset();
    setProvidersForTests({ story: new LocalStoryProvider(), image: new ProceduralImageProvider(), music: new ProceduralMusicProvider(), narration: new NoNarrationProvider() });
    sent = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)));
      return Response.json({ id: `re_${sent.length}` });
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("emails the sender once, on the recipient's first open, without the message itself", async () => {
    const gift = await liveGift();
    const first = await recordGiftOpen(gift.publicToken);
    expect(first).toMatchObject({ counted: true, firstOpen: true });
    expect(await notifyGiftOpened(first.gift!, first.at)).toBe("sent");

    const second = await recordGiftOpen(gift.publicToken);
    expect(second).toMatchObject({ counted: true, firstOpen: false });
    expect(await notifyGiftOpened(second.gift!, second.at)).toBe("already-sent"); // even if asked again

    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toEqual(["tom@example.test"]);
    expect(sent[0]!.subject).toBe("Maya opened your message");
    expect(sent[0]!.html).toContain(`/gifts/${gift.id}`);
    for (const part of [sent[0]!.html, sent[0]!.text]) {
      expect(part).not.toContain("brave one");
      expect(part).not.toContain(gift.publicToken);
    }
    expect((await getStore().gifts.get(gift.id))?.openNotifiedAt).toBe(first.at);
  });

  it("two first opens at the same moment still send one email", async () => {
    const gift = await liveGift();
    const [a, b] = await Promise.all([recordGiftOpen(gift.publicToken), recordGiftOpen(gift.publicToken)]);
    const results = await Promise.all([notifyGiftOpened(a.gift!, a.at), notifyGiftOpened(b.gift!, b.at)]);
    expect(results.filter((r) => r === "sent")).toHaveLength(1);
    expect(sent).toHaveLength(1);
  });

  it("doesn't count the sender's own views", async () => {
    const gift = await liveGift();
    const own = await recordGiftOpen(gift.publicToken, { viewerId: member.id });
    expect(own).toMatchObject({ counted: false, firstOpen: false });
    expect((await getStore().gifts.get(gift.id))?.openCount).toBe(0);
    const theirs = await recordGiftOpen(gift.publicToken, { viewerId: "someone-else" });
    expect(theirs).toMatchObject({ counted: true, firstOpen: true });
  });

  it("respects the sender's choice, and skips accounts without an address", async () => {
    const off = await liveGift();
    await getStore().gifts.update(off.id, { notifyOnOpen: false });
    const o = await recordGiftOpen(off.publicToken);
    expect(await notifyGiftOpened(o.gift!, o.at)).toBe("off");
    expect(openNoticePanel(member, (await getStore().gifts.get(off.id))!)).toEqual({ email: "tom@example.test", on: false, sentAt: null });

    const guestGift = await liveGift(guest);
    const g = await recordGiftOpen(guestGift.publicToken);
    expect(await notifyGiftOpened(g.gift!, g.at)).toBe("no-address");
    expect(openNoticePanel(guest, guestGift)).toBeNull();
    expect(sent).toHaveLength(0);
  });

  it("gifts opened before this existed don't get a late 'first open' email", async () => {
    const gift = await liveGift();
    await getStore().gifts.update(gift.id, { firstOpenedAt: "2026-01-01T10:00:00.000Z", openCount: 3 });
    expect((await recordGiftOpen(gift.publicToken)).firstOpen).toBe(false);
  });

  it("revoked or unknown links count nothing", async () => {
    const gift = await liveGift();
    await getStore().gifts.update(gift.id, { status: "revoked" });
    expect((await recordGiftOpen(gift.publicToken)).counted).toBe(false);
    expect((await recordGiftOpen("not-a-token")).counted).toBe(false);
  });
});
