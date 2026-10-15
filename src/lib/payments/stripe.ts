import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/config/env";

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return env.stripeConfigured;
}

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)");
  client ??= new Stripe(env.STRIPE_SECRET_KEY, { appInfo: { name: "Message in a Bottle" } });
  return client;
}
