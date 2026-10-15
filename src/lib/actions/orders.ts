"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError, requireAdmin, requireOwnedGift, requireOwnedOrder, requireUser } from "@/lib/auth/guards";
import { formatIssues } from "@/lib/domain/schemas";
import type { Fulfilment } from "@/lib/domain/types";
import { OrderError, updateFulfilment } from "@/lib/orders/service";
import { completeDemoPayment, startCheckout } from "@/lib/payments/checkout";
import { ZodError } from "zod";
import type { ActionResult } from "./gifts";

function fail(err: unknown): ActionResult<never> {
  if (err instanceof ZodError) return { ok: false, error: "Some details need attention.", fieldErrors: formatIssues(err) };
  if (err instanceof OrderError || err instanceof AuthError) return { ok: false, error: err.message };
  console.error("[actions:orders] unexpected", err instanceof Error ? err.message : err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function startCheckoutAction(giftId: string, input: { productId: string; shippingAddress?: unknown }): Promise<ActionResult<{ orderId: string }>> {
  let destination: string;
  try {
    const user = await requireUser();
    const gift = await requireOwnedGift(giftId, user);
    const start = await startCheckout(user, gift, input);
    destination = start.kind === "stripe" ? start.url : `/checkout/${giftId}/demo/${start.orderId}`;
  } catch (err) {
    return fail(err);
  }
  redirect(destination);
}

export async function completeDemoPaymentAction(orderId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await completeDemoPayment(user, orderId);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard");
  redirect(`/orders/${orderId}`);
}

export async function refreshOrderAction(orderId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireOwnedOrder(orderId, user);
    revalidatePath(`/orders/${orderId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function updateFulfilmentAction(orderId: string, patch: { status?: Fulfilment["status"]; notes?: string; carrier?: string; trackingNumber?: string }): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await updateFulfilment(orderId, admin, patch);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}
