import "server-only";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/data";
import type { Gift, Order, UserProfile } from "@/lib/domain/types";
import { getCurrentUser } from "./session";

export class AuthError extends Error {
  constructor(public readonly status: 401 | 403 | 404, message: string) {
    super(message);
  }
}

/** For pages: redirects to the login page when signed out. */
export async function requireUserOrRedirect(next?: string): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

/** For actions and route handlers: throws instead of redirecting. */
export async function requireUser(): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, "Sign in to continue.");
  return user;
}

export async function requireAdmin(): Promise<UserProfile> {
  const user = await requireUser();
  if (!user.isAdmin) throw new AuthError(403, "Admin access required.");
  return user;
}

/**
 * Loads a gift and verifies ownership. A gift that exists but belongs to
 * someone else is reported as not found, so ids cannot be probed.
 */
export async function requireOwnedGift(giftId: string, user: UserProfile): Promise<Gift> {
  const gift = await getStore().gifts.get(giftId);
  if (!gift || gift.ownerId !== user.id) throw new AuthError(404, "Gift not found.");
  return gift;
}

export async function requireOwnedOrder(orderId: string, user: UserProfile): Promise<Order> {
  const order = await getStore().orders.get(orderId);
  if (!order || order.ownerId !== user.id) throw new AuthError(404, "Order not found.");
  return order;
}
