import type {
  AuditEvent,
  EmailDelivery,
  GenerationJob,
  Gift,
  GiftReply,
  JobStatus,
  Order,
  OrderStatus,
  PaymentEvent,
  ScheduledDelivery,
  UserProfile,
} from "@/lib/domain/types";

/**
 * Persistence boundary. Two implementations: Supabase (production) and a local
 * JSON / in-memory store (development, demos, tests). Nothing above this layer
 * knows which one is active.
 */
export interface DataStore {
  readonly kind: "supabase" | "local" | "memory";

  users: {
    get(id: string): Promise<UserProfile | null>;
    findByEmail(email: string): Promise<UserProfile | null>;
    upsert(user: UserProfile): Promise<UserProfile>;
  };

  gifts: {
    create(gift: Gift): Promise<Gift>;
    get(id: string): Promise<Gift | null>;
    getByPublicToken(token: string): Promise<Gift | null>;
    listByOwner(ownerId: string): Promise<Gift[]>;
    update(id: string, patch: Partial<Gift>): Promise<Gift | null>;
    delete(id: string): Promise<boolean>;
    recordOpen(id: string, at: string): Promise<void>;
    /** Atomically mark the "opened" email as sent. True only for the first caller. */
    claimOpenNotification(id: string, at: string): Promise<boolean>;
    /** Drafts and failed gifts not touched since `beforeIso` (retention sweep). */
    listAbandoned(beforeIso: string, limit: number): Promise<Gift[]>;
  };

  jobs: {
    create(job: GenerationJob): Promise<GenerationJob>;
    get(id: string): Promise<GenerationJob | null>;
    getLatestForGift(giftId: string): Promise<GenerationJob | null>;
    update(id: string, patch: Partial<GenerationJob>): Promise<GenerationJob | null>;
    /**
     * Atomically claim a job for `leaseUntil` if it is queued/running, due, and
     * not leased by another worker. Returns null when the claim fails.
     */
    claim(id: string, leaseUntil: string, now: string): Promise<GenerationJob | null>;
    listDue(now: string, limit: number): Promise<GenerationJob[]>;
    listRecent(limit: number, status?: JobStatus): Promise<GenerationJob[]>;
    countForOwnerSince(ownerId: string, sinceIso: string): Promise<number>;
  };

  orders: {
    create(order: Order): Promise<Order>;
    get(id: string): Promise<Order | null>;
    getByCheckoutSession(sessionId: string): Promise<Order | null>;
    getByPaymentIntent(paymentIntentId: string): Promise<Order | null>;
    listByOwner(ownerId: string): Promise<Order[]>;
    listByGift(giftId: string): Promise<Order[]>;
    listAll(filter?: { status?: OrderStatus; physicalOnly?: boolean }, limit?: number): Promise<Order[]>;
    update(id: string, patch: Partial<Order>): Promise<Order | null>;
  };

  payments: {
    /** Records a provider event. `duplicate` is true if the event id was seen before. */
    recordEvent(event: PaymentEvent): Promise<{ duplicate: boolean }>;
    /** Releases an event id after a failed handler so the provider's retry is processed. */
    deleteEvent(id: string): Promise<void>;
  };

  audit: {
    append(event: AuditEvent): Promise<void>;
    listRecent(limit: number): Promise<AuditEvent[]>;
  };

  emails: {
    create(delivery: EmailDelivery): Promise<EmailDelivery>;
    update(id: string, patch: Partial<EmailDelivery>): Promise<EmailDelivery | null>;
    listForGift(giftId: string): Promise<EmailDelivery[]>;
  };

  deliveries: {
    create(delivery: ScheduledDelivery): Promise<ScheduledDelivery>;
    get(id: string): Promise<ScheduledDelivery | null>;
    listByGift(giftId: string): Promise<ScheduledDelivery[]>;
    update(id: string, patch: Partial<ScheduledDelivery>): Promise<ScheduledDelivery | null>;
    /** Scheduled deliveries whose time has come, oldest first. */
    listDue(now: string, limit: number): Promise<ScheduledDelivery[]>;
    /** Atomically move a due, scheduled delivery to "sending". Null if another worker got it first. */
    claim(id: string, now: string): Promise<ScheduledDelivery | null>;
  };

  replies: {
    create(reply: GiftReply): Promise<GiftReply>;
    /** Newest first. */
    listByGift(giftId: string): Promise<GiftReply[]>;
    countByGift(giftId: string): Promise<number>;
    markRead(giftId: string, at: string): Promise<void>;
    /** Unread reply counts per gift, for one sender's dashboard. */
    unreadCountsByOwner(ownerId: string): Promise<Record<string, number>>;
  };

  rateLimit: {
    /** Sliding fixed-window counter. Returns whether the hit is allowed. */
    hit(key: string, limit: number, windowMs: number, now?: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }>;
  };
}
