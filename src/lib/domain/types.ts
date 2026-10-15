import type { MusicMoodId } from "./music";
import type { OccasionId } from "./occasions";
import type { ThemeId } from "./themes";
import type { ToneId } from "./tones";

export type { MusicMoodId, OccasionId, ThemeId, ToneId };

export type Pronouns = "she" | "he" | "they" | "unspecified";
export type AgeRange = "child" | "teen" | "adult" | "older" | "unspecified";
export type Transformation = "close" | "story" | "poetic";

/** Everything the sender enters in the wizard. */
export interface GiftInput {
  occasion: OccasionId;
  customOccasion: string;
  recipientName: string;
  relationship: string;
  pronouns: Pronouns;
  ageRange: AgeRange;
  recipientContext: string;
  senderName: string;
  message: string;
  memories: string;
  datesAndPlaces: string;
  tone: ToneId;
  transformation: Transformation;
  theme: ThemeId;
  music: MusicMoodId;
  narration: boolean;
}

/* ── Story ─────────────────────────────────────────────────────────────────── */

export type Motif =
  | "shore"
  | "bottle"
  | "lantern"
  | "stars"
  | "window"
  | "path"
  | "tree"
  | "letter"
  | "boat"
  | "garden"
  | "mountains"
  | "city";

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

export interface SceneArtSpec {
  theme: ThemeId;
  motif: Motif;
  timeOfDay: TimeOfDay;
  /** Deterministic seed for the procedural renderer. */
  seed: number;
}

export type SceneArt =
  | { kind: "procedural"; spec: SceneArtSpec; alt: string }
  | { kind: "image"; assetId: string; url: string; alt: string; width?: number; height?: number };

export interface Scene {
  id: string;
  order: number;
  heading: string;
  text: string;
  /** Visual description handed to an image provider. */
  artPrompt: string;
  art: SceneArt;
}

export interface Story {
  version: 1;
  title: string;
  opening: string;
  scenes: Scene[];
  closing: string;
  dedication: string;
  /** Which provider wrote the text and whether it was edited by the sender. */
  provenance: {
    provider: string;
    model?: string;
    generatedAt: string;
    editedBySender: boolean;
  };
}

export interface AudioAsset {
  kind: "music" | "narration";
  /** "procedural" means the browser synthesises it from the mood; "url" is a stored file. */
  source: { type: "procedural"; mood: MusicMoodId } | { type: "url"; url: string; assetId: string; durationMs?: number };
  provider: string;
  label: string;
  /** Honest label for the UI, e.g. "Demonstration soundtrack". */
  disclosure?: string;
}

/* ── Gift ──────────────────────────────────────────────────────────────────── */

export type GiftStatus = "draft" | "generating" | "ready" | "active" | "revoked" | "failed";

export interface Gift {
  id: string;
  ownerId: string;
  status: GiftStatus;
  input: GiftInput;
  story: Story | null;
  audio: AudioAsset[];
  /** Unguessable token used in the recipient URL. Never a database id. */
  publicToken: string;
  /** Selected product (catalogue id). */
  productId: string | null;
  openCount: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  activatedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What the recipient page is allowed to see. No sender account data. */
export interface PublicGift {
  token: string;
  recipientName: string;
  senderName: string;
  occasion: OccasionId;
  theme: ThemeId;
  story: Story;
  audio: AudioAsset[];
  narrationEnabled: boolean;
}

/* ── Generation jobs ───────────────────────────────────────────────────────── */

export type JobStep = "brief" | "story" | "scenes" | "images" | "audio" | "assemble";
export const JOB_STEPS: readonly JobStep[] = ["brief", "story", "scenes", "images", "audio", "assemble"];

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface JobError {
  code: string;
  message: string;
  /** Permanent errors (auth, billing, invalid request) are never retried. */
  permanent: boolean;
  at: string;
}

export interface JobUsage {
  provider: string;
  kind: "story" | "image" | "music" | "narration";
  units: number;
  unitLabel: string;
  /** Estimated cost in minor units (pence). */
  estimatedCostMinor: number;
}

export interface GenerationJob {
  id: string;
  giftId: string;
  ownerId: string;
  status: JobStatus;
  /** The step currently running or next to run. */
  step: JobStep;
  completedSteps: JobStep[];
  attempts: number;
  maxAttempts: number;
  /** Lease so two workers never run the same job; ISO timestamp. */
  leaseUntil: string | null;
  nextRunAt: string | null;
  lastError: JobError | null;
  usage: JobUsage[];
  /** Human-readable progress message for the generation screen. */
  progressMessage: string;
  /** "live" when real providers are involved, "demo" when everything is local. */
  mode: "live" | "demo";
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

/* ── Users ─────────────────────────────────────────────────────────────────── */

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  /** "supabase" accounts are real; "demo" accounts exist only in demo mode. */
  kind: "supabase" | "demo";
  createdAt: string;
  updatedAt: string;
}

/* ── Commerce ──────────────────────────────────────────────────────────────── */

export type ProductKind = "digital" | "physical";

export interface Product {
  id: string;
  kind: ProductKind;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  /** Price in minor units (pence). Indicative until validated. */
  priceMinor: number;
  currency: "GBP";
  /** Shipping in minor units; 0 for digital. */
  shippingMinor: number;
  requiresShipping: boolean;
  badge?: string;
  /** Hidden products can exist in config without being offered. */
  available: boolean;
  sort: number;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  country: string;
  giftNote: string;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "fulfilling"
  | "dispatched"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
}

export interface Fulfilment {
  status: "not_required" | "awaiting" | "printing" | "packed" | "dispatched" | "delivered";
  notes: string;
  carrier: string;
  trackingNumber: string;
  dispatchedAt: string | null;
  deliveredAt: string | null;
}

export interface Order {
  id: string;
  ownerId: string;
  giftId: string;
  status: OrderStatus;
  items: OrderItem[];
  currency: "GBP";
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  paymentProvider: "stripe" | "demo" | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  shippingAddress: ShippingAddress | null;
  fulfilment: Fulfilment;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentEvent {
  /** Provider event id (e.g. Stripe event id). Unique: used for idempotency. */
  id: string;
  provider: "stripe" | "demo";
  type: string;
  orderId: string | null;
  amountMinor: number | null;
  currency: string | null;
  receivedAt: string;
}

/* ── Audit / deliveries ────────────────────────────────────────────────────── */

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string | null;
  action: string;
  subjectType: "gift" | "order" | "job" | "user" | "system";
  subjectId: string | null;
  /** Never message contents. Small, structured context only. */
  meta: Record<string, string | number | boolean | null>;
}

export interface EmailDelivery {
  id: string;
  giftId: string | null;
  orderId: string | null;
  to: string;
  template: string;
  provider: string;
  status: "queued" | "sent" | "failed" | "skipped";
  providerMessageId: string | null;
  error: string | null;
  createdAt: string;
}
