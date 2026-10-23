import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.RESEND_API_KEY = "re_test_key";
});

import { LocalStore } from "@/lib/data/local-store";
import { getStore } from "@/lib/data";
import type { GiftInput, UserProfile } from "@/lib/domain/types";
import { activateGift, createGift, deleteGift, startGeneration } from "./service";
import { addReply, cleanReply, MAX_REPLIES_PER_GIFT, notifyReply, repliesForOwner } from "./replies";
import { setProvidersForTests } from "@/lib/providers/registry";
import { LocalStoryProvider } from "@/lib/story/local-writer";
import { ProceduralImageProvider } from "@/lib/providers/image/procedural";
import { ProceduralMusicProvider } from "@/lib/providers/music/procedural";
import { NoNarrationProvider } from "@/lib/providers/narration/none";

const member: UserProfile = { id: "member-1", email: "tom@example.test", displayName: "Tom", isAdmin: false, kind: "supabase", createdAt: "", updatedAt: "" };
const input: GiftInput = { occasion: "thank-you", customOccasion: "", recipientName: "Priya", relationship: "my friend", pronouns: "she", ageRange: "adult", recipientContext: "", senderName: "Tom", message: "Thank you for driving three hours to sit with me in that waiting room. You didn't say much. You didn't need to.", memories: "", datesAndPlaces: "", tone: "heartfelt", transformation: "story", theme: "minimal", music: "peaceful", narration: false, songUrl: "", rememberedName: "", rememberedDates: "" };

let sent: Array<{ to: string[]; subject: string; html: string; text: string }> = [];

async function liveGift() {
  await getStore().users.upsert(member);
  const gift = await createGift(member, input);
  await startGeneration(member, gift, { runInline: true });
  return activateGift((await getStore().gifts.get(gift.id))!, "demo");
}

describe("replies", () => {
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

  it("keeps replies as plain text", () => {
    expect(cleanReply("  Thank you.\r\n\r\n\r\n\r\nReally.  ")).toBe("Thank you.\n\nReally.");
    expect(cleanReply("hi\u0000‮there​")).toBe("hithere");
    expect(() => cleanReply("   \n ")).toThrow(/few words/);
    expect(() => cleanReply("x".repeat(1001))).toThrow(/under 1000/);
    expect(cleanReply("<script>alert(1)</script>")).toBe("<script>alert(1)</script>"); // stored as text, rendered escaped
  });

  it("the recipient replies; the sender sees it once as new, then as read", async () => {
    const gift = await liveGift();
    await addReply(gift.publicToken, "Thank you, Tom. I'd do it again tomorrow.");
    expect(await getStore().replies.unreadCountsByOwner(member.id)).toEqual({ [gift.id]: 1 });
    const firstView = await repliesForOwner(gift);
    expect(firstView).toEqual([expect.objectContaining({ message: "Thank you, Tom. I'd do it again tomorrow.", isNew: true })]);
    expect((await repliesForOwner(gift))[0]?.isNew).toBe(false);
    expect(await getStore().replies.unreadCountsByOwner(member.id)).toEqual({});
  });

  it("only works on a live link, and not for the sender's own gift", async () => {
    const gift = await liveGift();
    await expect(addReply(gift.publicToken, "hello", { viewerId: member.id })).rejects.toMatchObject({ status: 403 });
    await expect(addReply("not-a-real-token", "hello")).rejects.toMatchObject({ status: 404 });
    await getStore().gifts.update(gift.id, { status: "revoked" });
    await expect(addReply(gift.publicToken, "hello")).rejects.toMatchObject({ status: 404 });
    await getStore().gifts.update(gift.id, { status: "active", expiresAt: "2020-01-01T00:00:00.000Z" });
    await expect(addReply(gift.publicToken, "hello")).rejects.toMatchObject({ status: 404 });
  });

  it("limits how many replies one link can send", async () => {
    const gift = await liveGift();
    for (let i = 0; i < 5; i++) await addReply(gift.publicToken, `Reply ${i}`);
    await expect(addReply(gift.publicToken, "one more")).rejects.toMatchObject({ status: 429 });

    const gift2 = await liveGift();
    for (let i = 0; i < MAX_REPLIES_PER_GIFT; i++) await getStore().replies.create({ id: `r${i}`, giftId: gift2.id, ownerId: member.id, message: "x", createdAt: new Date().toISOString(), readAt: null });
    await expect(addReply(gift2.publicToken, "too many")).rejects.toMatchObject({ status: 409 });
  });

  it("emails the sender (not the reply itself), at most every 30 minutes, and respects their choice", async () => {
    const gift = await liveGift();
    const { reply } = await addReply(gift.publicToken, "A very private thank you.");
    expect(await notifyReply(gift)).toBe("sent");
    expect(await notifyReply(gift)).toBe("skipped"); // throttled
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: ["tom@example.test"], subject: "Priya wrote back" });
    expect(sent[0]!.html).toContain(`/gifts/${gift.id}#replies`);
    expect(sent[0]!.html + sent[0]!.text).not.toContain(reply.message);

    const quiet = await liveGift();
    await getStore().gifts.update(quiet.id, { notifyOnOpen: false });
    expect(await notifyReply((await getStore().gifts.get(quiet.id))!)).toBe("skipped");
    expect(sent).toHaveLength(1);
  });

  it("deleting the gift deletes its replies", async () => {
    const gift = await liveGift();
    await addReply(gift.publicToken, "Thank you");
    await deleteGift((await getStore().gifts.get(gift.id))!);
    expect(await getStore().replies.listByGift(gift.id)).toEqual([]);
  });
});
