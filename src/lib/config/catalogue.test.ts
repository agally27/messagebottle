import { afterEach, describe, expect, it, vi } from "vitest";
import type { GiftInput, UserProfile } from "@/lib/domain/types";
import { getProduct, listProducts, priceOrder } from "./catalogue";

const nov = new Date("2026-11-10T12:00:00Z");

describe("catalogue", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("offers only the digital gift when physical products are off", () => {
    expect(listProducts({ physical: false, now: nov }).map((p) => p.id)).toEqual(["digital"]);
    for (const id of ["little-bottle", "keepsake-box", "memory-bottle", "christmas-bottle"]) {
      expect(getProduct(id, { physical: false, now: nov })).toBeNull();
      expect(priceOrder(id, 1, { physical: false, now: nov })).toBeNull();
    }
    expect(priceOrder("digital", 1, { physical: false })?.totalMinor).toBe(499);
  });

  it("offers physical products when switched on", () => {
    const ids = listProducts({ physical: true, now: nov }).map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["digital", "little-bottle", "keepsake-box", "memory-bottle", "christmas-bottle"]));
  });

  it("defaults to off, and the server refuses a physical order and a physical product id on a new gift", async () => {
    vi.stubEnv("PHYSICAL_PRODUCTS", "");
    vi.resetModules();
    const { physicalProductsEnabled } = await import("./catalogue");
    expect(physicalProductsEnabled()).toBe(false);
    const { createGift, startGeneration } = await import("@/lib/gifts/service");
    const { createPendingOrder } = await import("@/lib/orders/service");
    const { setProvidersForTests } = await import("@/lib/providers/registry");
    const { LocalStoryProvider } = await import("@/lib/story/local-writer");
    const { ProceduralImageProvider } = await import("@/lib/providers/image/procedural");
    const { ProceduralMusicProvider } = await import("@/lib/providers/music/procedural");
    const { NoNarrationProvider } = await import("@/lib/providers/narration/none");
    const { getStore } = await import("@/lib/data");
    setProvidersForTests({ story: new LocalStoryProvider(), image: new ProceduralImageProvider(), music: new ProceduralMusicProvider(), narration: new NoNarrationProvider() });
    const user: UserProfile = { id: "user-off", email: null, displayName: "Tom", isAdmin: false, kind: "demo", createdAt: "", updatedAt: "" };
    const input: GiftInput = { occasion: "thank-you", customOccasion: "", recipientName: "Priya", relationship: "my friend", pronouns: "she", ageRange: "adult", recipientContext: "", senderName: "Tom", message: "Thank you for driving three hours to sit with me in that waiting room. You didn't say much. You didn't need to.", memories: "", datesAndPlaces: "", tone: "heartfelt", transformation: "story", theme: "minimal", music: "peaceful", narration: false, songUrl: "", rememberedName: "", rememberedDates: "" };
    const gift = await createGift(user, input, { productId: "little-bottle" });
    expect(gift.productId).toBeNull();
    await startGeneration(user, gift, { runInline: true });
    const ready = (await getStore().gifts.get(gift.id))!;
    const address = { name: "Priya S", line1: "1 Harbour Lane", line2: "", city: "Whitby", postcode: "YO21 1AA", country: "GB", giftNote: "" };
    await expect(createPendingOrder(user, ready, { productId: "little-bottle", shippingAddress: address })).rejects.toThrow(/isn't available/);
    expect((await createPendingOrder(user, ready, { productId: "digital" })).totalMinor).toBe(499);
  });
});
