import type { Product } from "@/lib/domain/types";

/**
 * Product catalogue. Prices are INDICATIVE hypotheses (see docs/PRODUCT.md) and
 * are the only source of truth for checkout — the client never supplies a price.
 * Amounts are in minor units (pence). Safe for client code; what can be sold
 * right now (season, physical switch) is decided server-side in ./catalogue.
 */
export const PRODUCTS: readonly Product[] = [
  {
    id: "digital",
    kind: "digital",
    name: "Digital Gift",
    tagline: "A personalised story, delivered by private link.",
    description:
      "Your message becomes an illustrated, personalised story with a soundtrack. The recipient opens it on any phone or computer — no app, no account.",
    features: [
      "Personalised illustrated story",
      "Soundtrack and optional narration",
      "Private link that only they can open",
      "Edit anytime before and after sending",
    ],
    priceMinor: 499,
    currency: "GBP",
    shippingMinor: 0,
    requiresShipping: false,
    available: true,
    sort: 1,
  },
  {
    id: "little-bottle",
    kind: "physical",
    name: "Little Bottle",
    tagline: "The digital gift, plus a real bottle to hold it.",
    description:
      "A small glass keepsake bottle with your message printed and rolled inside, sealed with a ribbon, and a QR code that opens the digital story.",
    features: [
      "Everything in the Digital Gift",
      "Glass keepsake bottle with rolled, printed message",
      "Ribbon seal and QR code card",
      "Protective gift packaging",
    ],
    priceMinor: 1699,
    currency: "GBP",
    shippingMinor: 395,
    requiresShipping: true,
    badge: "Signature",
    available: true,
    sort: 2,
  },
  {
    id: "memory-bottle",
    kind: "physical",
    name: "Memory Bottle",
    tagline: "Your message and three of your photos, tied together in a bottle.",
    description:
      "Your message printed and rolled inside a glass keepsake bottle, with three of the gift's photos printed as mini prints and tied alongside with twine. A QR card opens the full story, every photo and your song.",
    features: [
      "Everything in the Little Bottle",
      "Three mini photo prints from your gift, tied with twine",
      "QR card that opens the story, photos and song",
      "Gentle remembrance wording when it's in someone's memory",
    ],
    priceMinor: 2499,
    currency: "GBP",
    shippingMinor: 395,
    requiresShipping: true,
    badge: "Memories",
    available: true,
    sort: 3,
    minPhotos: 1,
  },
  {
    id: "keepsake-box",
    kind: "physical",
    name: "Keepsake Gift Box",
    tagline: "The bottle, in a box made to be kept.",
    description:
      "The Little Bottle presented in a lined keepsake box with a printed story booklet and a handwritten-style dedication card.",
    features: [
      "Everything in the Little Bottle",
      "Lined keepsake gift box",
      "Printed story booklet",
      "Dedication card",
    ],
    priceMinor: 3499,
    currency: "GBP",
    shippingMinor: 0,
    requiresShipping: true,
    badge: "Premium",
    available: true,
    sort: 4,
  },
  {
    id: "christmas-bottle",
    kind: "physical",
    name: "Christmas Bottle",
    tagline: "Your Christmas card, rolled in a glowing bottle that smells of the season.",
    description:
      "Your Christmas message printed as a card and rolled inside a glowing glass bottle, sealed with red ribbon and a sprig of faux holly, on lightly scented paper. A QR card opens the illustrated story with a carol, sung to a traditional tune with words written for them.",
    features: [
      "Your Christmas card, printed and rolled inside",
      "Lightly scented in your choice of festive fragrance",
      "Glowing bottle with red ribbon, holly and QR card",
      "The illustrated story with a personalised carol",
    ],
    priceMinor: 1999,
    currency: "GBP",
    shippingMinor: 395,
    requiresShipping: true,
    badge: "Christmas",
    available: true,
    sort: 0,
    season: { from: "10-01", until: "12-18", label: "Christmas" },
    scentOptions: [
      { id: "winter-spice", label: "Winter spice", notes: "Orange, clove and cinnamon" },
      { id: "fireside-pine", label: "Fireside pine", notes: "Pine needles and cedarwood" },
      { id: "unscented", label: "Unscented", notes: "For anyone sensitive to fragrance" },
    ],
  },
] as const;

/** True when a product can be sold on `now` (seasonal window inclusive, UK date). */
export function isInSeason(p: Pick<Product, "season">, now: Date = new Date()): boolean {
  if (!p.season) return true;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  const md = `${get("month")}-${get("day")}`;
  const { from, until } = p.season;
  return from <= until ? md >= from && md <= until : md >= from || md <= until;
}

/** True when a product may be sold: in season, available, and (if physical) physical sales are on. */
export function isSellable(p: Product, opts: { now?: Date; physical: boolean }): boolean {
  return p.available && isInSeason(p, opts.now) && (p.kind === "digital" || opts.physical);
}

/** Label for a chosen option value, e.g. scent id → "Winter spice". */
export function describeOptions(productId: string, options: Record<string, string> | undefined): string {
  if (!options?.scent) return "";
  const product = PRODUCTS.find((p) => p.id === productId);
  const scent = product?.scentOptions?.find((s) => s.id === options.scent);
  return scent ? `${scent.label} fragrance` : "";
}

export function formatPrice(minor: number, currency = "GBP", locale = "en-GB"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(minor / 100);
}
