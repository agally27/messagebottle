import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { LocalStore } from "@/lib/data/local-store";
import { getStore } from "@/lib/data";
import { getMediaStore } from "@/lib/media";
import type { MemoryMediaStore } from "@/lib/media/store";
import type { GiftInput, UserProfile } from "@/lib/domain/types";
import { giftInputSchema } from "@/lib/domain/schemas";
import { parseSongLink } from "@/lib/domain/song";
import { activateGift, applyGiftSettings, createGift, deleteGift, startGeneration, toPublicGift } from "./service";
import { addPhoto, editPhotos, PhotoError, processPhoto, removePhoto } from "./photos";
import { setProvidersForTests } from "@/lib/providers/registry";
import { LocalStoryProvider } from "@/lib/story/local-writer";
import { ProceduralImageProvider } from "@/lib/providers/image/procedural";
import { ProceduralMusicProvider } from "@/lib/providers/music/procedural";
import { NoNarrationProvider } from "@/lib/providers/narration/none";
import { createPendingOrder } from "@/lib/orders/service";
import { GET as publicPhoto } from "@/app/api/g/[token]/photos/[photoId]/route";

const user: UserProfile = { id: "user-1", email: null, displayName: "Ana", isAdmin: false, kind: "demo", createdAt: "", updatedAt: "" };
const input: GiftInput = { occasion: "memories", customOccasion: "", recipientName: "Sam", relationship: "my husband", pronouns: "he", ageRange: "adult", recipientContext: "", senderName: "Ana", message: "Twenty years ago you spilled a drink on my coat at a party in Leeds and spent the rest of the night apologising. I still have the coat.", memories: "", datesAndPlaces: "", tone: "heartfelt", transformation: "story", theme: "watercolour", music: "peaceful", narration: false, songUrl: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc", rememberedName: "", rememberedDates: "" };
const address = { name: "Sam", line1: "1 Harbour Lane", line2: "", city: "Whitby", postcode: "YO21 1AA", country: "GB", giftNote: "" };

async function jpeg(withExif = false): Promise<Buffer> {
  let img = sharp({ create: { width: 2400, height: 1200, channels: 3, background: { r: 120, g: 160, b: 190 } } }).jpeg();
  if (withExif) img = img.withMetadata({ exif: { IFD0: { Copyright: "secret-owner", Artist: "Someone" } } });
  return img.toBuffer();
}

async function readyGift(overrides: Partial<GiftInput> = {}) {
  const gift = await createGift(user, { ...input, ...overrides });
  await startGeneration(user, gift, { runInline: true });
  return (await getStore().gifts.get(gift.id))!;
}

const media = () => getMediaStore() as MemoryMediaStore;

describe("song links", () => {
  it("accepts well-known music services and builds their official embed", () => {
    expect(parseSongLink("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc")).toMatchObject({ provider: "spotify", url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", embedUrl: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC" });
    expect(parseSongLink("https://youtu.be/dQw4w9WgXcQ")?.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(parseSongLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")?.provider).toBe("youtube");
    expect(parseSongLink("https://music.apple.com/gb/album/x/123?i=456")?.embedUrl).toBe("https://embed.music.apple.com/gb/album/x/123?i=456");
    expect(parseSongLink("https://www.deezer.com/track/1")).toMatchObject({ provider: "deezer", embedUrl: null });
  });

  it("refuses anything else", () => {
    expect(parseSongLink("http://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")).toBeNull();
    expect(parseSongLink("https://evil.example/track/1")).toBeNull();
    expect(parseSongLink("https://open.spotify.com.evil.example/track/4uLU6hMCjMI75M1A2tKUQC")).toBeNull();
    expect(parseSongLink("javascript:alert(1)")).toBeNull();
    expect(parseSongLink("https://www.youtube.com/watch?v=<script>")).toBeNull();
    expect(giftInputSchema.safeParse({ ...input, songUrl: "https://evil.example/x" }).success).toBe(false);
  });
});

describe("photos", () => {
  beforeEach(async () => {
    await (getStore() as LocalStore).reset();
    setProvidersForTests({ story: new LocalStoryProvider(), image: new ProceduralImageProvider(), music: new ProceduralMusicProvider(), narration: new NoNarrationProvider() });
  });

  it("re-encodes uploads: resized, JPEG, metadata removed", async () => {
    const original = await jpeg(true);
    expect((await sharp(original).metadata()).exif).toBeDefined();
    const out = await processPhoto(original, "image/jpeg");
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("jpeg");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1600);
    expect(meta.exif).toBeUndefined();
    expect(out.data.includes(Buffer.from("secret-owner"))).toBe(false);
  });

  it("rejects non-images and unsupported types", async () => {
    await expect(processPhoto(Buffer.from("<svg onload=alert(1)>"), "image/svg+xml")).rejects.toBeInstanceOf(PhotoError);
    await expect(processPhoto(Buffer.from("not an image at all"), "image/jpeg")).rejects.toThrow(/couldn't read/);
  });

  it("stores photos privately, caps them at 12 and edits captions, years and order", async () => {
    const gift = await readyGift();
    const data = await jpeg();
    const a = await addPhoto(gift, { data, type: "image/jpeg" }, { caption: "Leeds", year: 2004 });
    const b = await addPhoto(gift, { data, type: "image/jpeg" }, { caption: "Now", year: null });
    expect(media().has(a.storageKey)).toBe(true);
    expect(a.storageKey).toMatch(new RegExp(`^gifts/${gift.id}/photos/`));
    let fresh = (await getStore().gifts.get(gift.id))!;
    await editPhotos(fresh, { photos: [{ id: a.id, caption: "The party in Leeds", year: 2004 }], order: [b.id, a.id] });
    fresh = (await getStore().gifts.get(gift.id))!;
    expect(fresh.photos?.find((p) => p.id === a.id)).toMatchObject({ caption: "The party in Leeds", order: 1 });
    await expect(editPhotos(fresh, { photos: [], order: [a.id] })).rejects.toThrow(/order/);
    for (let i = 0; i < 10; i++) await addPhoto((await getStore().gifts.get(gift.id))!, { data, type: "image/jpeg" });
    await expect(addPhoto((await getStore().gifts.get(gift.id))!, { data, type: "image/jpeg" })).rejects.toThrow(/up to 12/);
    await removePhoto((await getStore().gifts.get(gift.id))!, a.id);
    expect(media().has(a.storageKey)).toBe(false);
    expect((await getStore().gifts.get(gift.id))!.photos).toHaveLength(11);
  });

  it("public view uses the token route and never exposes the gift id or storage keys", async () => {
    const gift = await readyGift();
    await addPhoto(gift, { data: await jpeg(), type: "image/jpeg" }, { caption: "Us" });
    const fresh = (await getStore().gifts.get(gift.id))!;
    const pub = toPublicGift(fresh);
    expect(pub.photos[0]?.url).toBe(`/api/g/${fresh.publicToken}/photos/${fresh.photos![0]!.id}`);
    expect(JSON.stringify(pub)).not.toContain(gift.id);
    expect(JSON.stringify(pub)).not.toContain("storageKey");
    expect(pub.song).toMatchObject({ provider: "spotify", providerName: "Spotify" });
    expect(toPublicGift(fresh, { preview: true }).photos[0]?.url).toBe(`/api/gifts/${gift.id}/photos/${fresh.photos![0]!.id}`);
  });

  it("serves a photo by token only once the gift is live", async () => {
    const gift = await readyGift();
    const photo = await addPhoto(gift, { data: await jpeg(), type: "image/jpeg" });
    const call = async (token: string, photoId: string) => publicPhoto(new Request("http://localhost/x"), { params: Promise.resolve({ token, photoId }) } as never);
    expect((await call(gift.publicToken, photo.id)).status).toBe(404); // ready, not yet paid/active
    await activateGift((await getStore().gifts.get(gift.id))!, "demo");
    const ok = await call(gift.publicToken, photo.id);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/jpeg");
    expect(ok.headers.get("x-robots-tag")).toBe("noindex");
    expect((await call(gift.publicToken, "someone-elses-photo")).status).toBe(404);
    expect((await call("not-a-real-token", photo.id)).status).toBe(404);
  });

  it("deleting a gift deletes its photos", async () => {
    const gift = await readyGift();
    const photo = await addPhoto(gift, { data: await jpeg(), type: "image/jpeg" });
    await deleteGift((await getStore().gifts.get(gift.id))!);
    expect(media().has(photo.storageKey)).toBe(false);
  });

  it("the Memory Bottle needs at least one photo to print", async () => {
    const gift = await readyGift();
    await expect(createPendingOrder(user, gift, { productId: "memory-bottle", shippingAddress: address })).rejects.toThrow(/at least one photo/);
    await addPhoto(gift, { data: await jpeg(), type: "image/jpeg" });
    const order = await createPendingOrder(user, (await getStore().gifts.get(gift.id))!, { productId: "memory-bottle", shippingAddress: address });
    expect(order.totalMinor).toBe(2499 + 395);
  });

  it("remembrance details are saved without regenerating and shown gently", async () => {
    const gift = await readyGift({ occasion: "remembrance", songUrl: "" });
    const updated = await applyGiftSettings(gift, { rememberedName: "Grandad Joe", rememberedDates: "1938 – 2023", songUrl: "https://youtu.be/dQw4w9WgXcQ" });
    expect(updated.story).toEqual(gift.story);
    const pub = toPublicGift(updated);
    expect(pub.inMemoryOf).toEqual({ name: "Grandad Joe", dates: "1938 – 2023" });
    expect(pub.song?.provider).toBe("youtube");
    await expect(applyGiftSettings(updated, { songUrl: "https://evil.example/x" })).rejects.toThrow();
  });
});
