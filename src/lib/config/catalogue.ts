import "server-only";
import { env } from "./env";
import { PRODUCTS, isSellable } from "./products";
import type { Product } from "@/lib/domain/types";

/**
 * What can be sold right now. Physical keepsakes are offered only when
 * PHYSICAL_PRODUCTS=on; seasonal products only inside their window.
 * `physical` can be passed explicitly (tests, previews).
 */
type Opts = { now?: Date; physical?: boolean };

const physicalOn = (o: Opts) => o.physical ?? env.physicalProducts;

export function physicalProductsEnabled(): boolean {
  return env.physicalProducts;
}

export function getProduct(id: string, opts: Opts = {}): Product | null {
  return PRODUCTS.find((p) => p.id === id && isSellable(p, { now: opts.now, physical: physicalOn(opts) })) ?? null;
}

export function listProducts(opts: Opts & { seasonal?: boolean } = {}): Product[] {
  return [...PRODUCTS]
    .filter((p) => isSellable(p, { now: opts.now, physical: physicalOn(opts) }) && (opts.seasonal === undefined || Boolean(p.season) === opts.seasonal))
    .sort((a, b) => a.sort - b.sort);
}

/** Server-side order total. Never trust a client-supplied amount. */
export function priceOrder(productId: string, quantity = 1, opts: Opts = {}): { subtotalMinor: number; shippingMinor: number; totalMinor: number; product: Product } | null {
  const product = getProduct(productId, opts);
  if (!product) return null;
  const qty = Math.max(1, Math.min(5, Math.floor(quantity)));
  const subtotalMinor = product.priceMinor * qty;
  const shippingMinor = product.requiresShipping ? product.shippingMinor : 0;
  return { subtotalMinor, shippingMinor, totalMinor: subtotalMinor + shippingMinor, product };
}
