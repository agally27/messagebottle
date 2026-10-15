import type { Product } from "@/lib/domain/types";

/**
 * Product catalogue. Prices are INDICATIVE hypotheses (see docs/PRODUCT.md) and
 * are the only source of truth for checkout — the client never supplies a price.
 * Amounts are in minor units (pence).
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
    sort: 3,
  },
] as const;

export function getProduct(id: string): Product | null {
  return PRODUCTS.find((p) => p.id === id && p.available) ?? null;
}

export function listProducts(): Product[] {
  return [...PRODUCTS].filter((p) => p.available).sort((a, b) => a.sort - b.sort);
}

export function formatPrice(minor: number, currency = "GBP", locale = "en-GB"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(minor / 100);
}

/** Server-side order total. Never trust a client-supplied amount. */
export function priceOrder(productId: string, quantity = 1): { subtotalMinor: number; shippingMinor: number; totalMinor: number; product: Product } | null {
  const product = getProduct(productId);
  if (!product) return null;
  const qty = Math.max(1, Math.min(5, Math.floor(quantity)));
  const subtotalMinor = product.priceMinor * qty;
  const shippingMinor = product.requiresShipping ? product.shippingMinor : 0;
  return { subtotalMinor, shippingMinor, totalMinor: subtotalMinor + shippingMinor, product };
}
