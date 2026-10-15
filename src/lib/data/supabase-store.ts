import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/config/env";
import type { DataStore } from "./store";
import type { AuditEvent, EmailDelivery, GenerationJob, Gift, JobStatus, Order, OrderStatus, UserProfile } from "@/lib/domain/types";

/**
 * Supabase (Postgres) store. Uses the server-only secret key: this layer is
 * only ever reached after our own ownership checks, and background jobs and
 * webhooks have no user session. RLS still protects direct client access.
 *
 * Column mapping: snake_case in Postgres, camelCase in the domain.
 * NOT YET VERIFIED against a live project (no credentials in this environment).
 */
export class SupabaseStore implements DataStore {
  readonly kind = "supabase" as const;
  private client: SupabaseClient;

  constructor() {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
      throw new Error("SupabaseStore requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
    }
    this.client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  private static iso(v: unknown): string | null {
    return v ? new Date(v as string).toISOString() : null;
  }

  private static user(row: Record<string, unknown>): UserProfile {
    return {
      id: row.id as string,
      email: (row.email as string | null) ?? null,
      displayName: (row.display_name as string | null) ?? null,
      isAdmin: Boolean(row.is_admin),
      kind: (row.kind as UserProfile["kind"]) ?? "supabase",
      createdAt: SupabaseStore.iso(row.created_at)!,
      updatedAt: SupabaseStore.iso(row.updated_at)!,
    };
  }

  private static gift(row: Record<string, unknown>): Gift {
    return {
      id: row.id as string,
      ownerId: row.owner_id as string,
      status: row.status as Gift["status"],
      input: row.input as Gift["input"],
      story: (row.story as Gift["story"]) ?? null,
      audio: (row.audio as Gift["audio"]) ?? [],
      publicToken: row.public_token as string,
      productId: (row.product_id as string | null) ?? null,
      openCount: (row.open_count as number) ?? 0,
      firstOpenedAt: SupabaseStore.iso(row.first_opened_at),
      lastOpenedAt: SupabaseStore.iso(row.last_opened_at),
      activatedAt: SupabaseStore.iso(row.activated_at),
      revokedAt: SupabaseStore.iso(row.revoked_at),
      expiresAt: SupabaseStore.iso(row.expires_at),
      createdAt: SupabaseStore.iso(row.created_at)!,
      updatedAt: SupabaseStore.iso(row.updated_at)!,
    };
  }

  private static giftRow(g: Partial<Gift>): Record<string, unknown> {
    const r: Record<string, unknown> = {};
    if (g.id !== undefined) r.id = g.id;
    if (g.ownerId !== undefined) r.owner_id = g.ownerId;
    if (g.status !== undefined) r.status = g.status;
    if (g.input !== undefined) r.input = g.input;
    if (g.story !== undefined) r.story = g.story;
    if (g.audio !== undefined) r.audio = g.audio;
    if (g.publicToken !== undefined) r.public_token = g.publicToken;
    if (g.productId !== undefined) r.product_id = g.productId;
    if (g.openCount !== undefined) r.open_count = g.openCount;
    if (g.firstOpenedAt !== undefined) r.first_opened_at = g.firstOpenedAt;
    if (g.lastOpenedAt !== undefined) r.last_opened_at = g.lastOpenedAt;
    if (g.activatedAt !== undefined) r.activated_at = g.activatedAt;
    if (g.revokedAt !== undefined) r.revoked_at = g.revokedAt;
    if (g.expiresAt !== undefined) r.expires_at = g.expiresAt;
    if (g.createdAt !== undefined) r.created_at = g.createdAt;
    return r;
  }

  private static job(row: Record<string, unknown>): GenerationJob {
    return {
      id: row.id as string,
      giftId: row.gift_id as string,
      ownerId: row.owner_id as string,
      status: row.status as JobStatus,
      step: row.step as GenerationJob["step"],
      completedSteps: (row.completed_steps as GenerationJob["completedSteps"]) ?? [],
      attempts: (row.attempts as number) ?? 0,
      maxAttempts: (row.max_attempts as number) ?? 3,
      leaseUntil: SupabaseStore.iso(row.lease_until),
      nextRunAt: SupabaseStore.iso(row.next_run_at),
      lastError: (row.last_error as GenerationJob["lastError"]) ?? null,
      usage: (row.usage as GenerationJob["usage"]) ?? [],
      progressMessage: (row.progress_message as string) ?? "",
      mode: (row.mode as GenerationJob["mode"]) ?? "demo",
      createdAt: SupabaseStore.iso(row.created_at)!,
      updatedAt: SupabaseStore.iso(row.updated_at)!,
      startedAt: SupabaseStore.iso(row.started_at),
      finishedAt: SupabaseStore.iso(row.finished_at),
    };
  }

  private static jobRow(j: Partial<GenerationJob>): Record<string, unknown> {
    const r: Record<string, unknown> = {};
    if (j.id !== undefined) r.id = j.id;
    if (j.giftId !== undefined) r.gift_id = j.giftId;
    if (j.ownerId !== undefined) r.owner_id = j.ownerId;
    if (j.status !== undefined) r.status = j.status;
    if (j.step !== undefined) r.step = j.step;
    if (j.completedSteps !== undefined) r.completed_steps = j.completedSteps;
    if (j.attempts !== undefined) r.attempts = j.attempts;
    if (j.maxAttempts !== undefined) r.max_attempts = j.maxAttempts;
    if (j.leaseUntil !== undefined) r.lease_until = j.leaseUntil;
    if (j.nextRunAt !== undefined) r.next_run_at = j.nextRunAt;
    if (j.lastError !== undefined) r.last_error = j.lastError;
    if (j.usage !== undefined) r.usage = j.usage;
    if (j.progressMessage !== undefined) r.progress_message = j.progressMessage;
    if (j.mode !== undefined) r.mode = j.mode;
    if (j.createdAt !== undefined) r.created_at = j.createdAt;
    if (j.startedAt !== undefined) r.started_at = j.startedAt;
    if (j.finishedAt !== undefined) r.finished_at = j.finishedAt;
    return r;
  }

  private static order(row: Record<string, unknown>): Order {
    return {
      id: row.id as string,
      ownerId: row.owner_id as string,
      giftId: row.gift_id as string,
      status: row.status as OrderStatus,
      items: row.items as Order["items"],
      currency: "GBP",
      subtotalMinor: row.subtotal_minor as number,
      shippingMinor: row.shipping_minor as number,
      totalMinor: row.total_minor as number,
      paymentProvider: (row.payment_provider as Order["paymentProvider"]) ?? null,
      stripeCheckoutSessionId: (row.stripe_checkout_session_id as string | null) ?? null,
      stripePaymentIntentId: (row.stripe_payment_intent_id as string | null) ?? null,
      shippingAddress: (row.shipping_address as Order["shippingAddress"]) ?? null,
      fulfilment: row.fulfilment as Order["fulfilment"],
      paidAt: SupabaseStore.iso(row.paid_at),
      createdAt: SupabaseStore.iso(row.created_at)!,
      updatedAt: SupabaseStore.iso(row.updated_at)!,
    };
  }

  private static orderRow(o: Partial<Order>): Record<string, unknown> {
    const r: Record<string, unknown> = {};
    if (o.id !== undefined) r.id = o.id;
    if (o.ownerId !== undefined) r.owner_id = o.ownerId;
    if (o.giftId !== undefined) r.gift_id = o.giftId;
    if (o.status !== undefined) r.status = o.status;
    if (o.items !== undefined) r.items = o.items;
    if (o.currency !== undefined) r.currency = o.currency;
    if (o.subtotalMinor !== undefined) r.subtotal_minor = o.subtotalMinor;
    if (o.shippingMinor !== undefined) r.shipping_minor = o.shippingMinor;
    if (o.totalMinor !== undefined) r.total_minor = o.totalMinor;
    if (o.paymentProvider !== undefined) r.payment_provider = o.paymentProvider;
    if (o.stripeCheckoutSessionId !== undefined) r.stripe_checkout_session_id = o.stripeCheckoutSessionId;
    if (o.stripePaymentIntentId !== undefined) r.stripe_payment_intent_id = o.stripePaymentIntentId;
    if (o.shippingAddress !== undefined) r.shipping_address = o.shippingAddress;
    if (o.fulfilment !== undefined) r.fulfilment = o.fulfilment;
    if (o.paidAt !== undefined) r.paid_at = o.paidAt;
    if (o.createdAt !== undefined) r.created_at = o.createdAt;
    return r;
  }

  private fail(context: string, error: { message: string } | null): never {
    throw new Error(`[supabase] ${context}: ${error?.message ?? "unknown error"}`);
  }

  users: DataStore["users"] = {
    get: async (id) => {
      const { data, error } = await this.client.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) this.fail("users.get", error);
      return data ? SupabaseStore.user(data) : null;
    },
    findByEmail: async (email) => {
      const { data, error } = await this.client.from("profiles").select("*").eq("email", email.toLowerCase()).maybeSingle();
      if (error) this.fail("users.findByEmail", error);
      return data ? SupabaseStore.user(data) : null;
    },
    upsert: async (user) => {
      const { data, error } = await this.client
        .from("profiles")
        .upsert({ id: user.id, email: user.email, display_name: user.displayName, is_admin: user.isAdmin, kind: user.kind })
        .select("*")
        .single();
      if (error) this.fail("users.upsert", error);
      return SupabaseStore.user(data);
    },
  };

  gifts: DataStore["gifts"] = {
    create: async (gift) => {
      const { data, error } = await this.client.from("gifts").insert(SupabaseStore.giftRow(gift)).select("*").single();
      if (error) this.fail("gifts.create", error);
      return SupabaseStore.gift(data);
    },
    get: async (id) => {
      const { data, error } = await this.client.from("gifts").select("*").eq("id", id).maybeSingle();
      if (error) this.fail("gifts.get", error);
      return data ? SupabaseStore.gift(data) : null;
    },
    getByPublicToken: async (token) => {
      const { data, error } = await this.client.from("gifts").select("*").eq("public_token", token).maybeSingle();
      if (error) this.fail("gifts.getByPublicToken", error);
      return data ? SupabaseStore.gift(data) : null;
    },
    listByOwner: async (ownerId) => {
      const { data, error } = await this.client.from("gifts").select("*").eq("owner_id", ownerId).order("updated_at", { ascending: false });
      if (error) this.fail("gifts.listByOwner", error);
      return (data ?? []).map(SupabaseStore.gift);
    },
    update: async (id, patch) => {
      const { data, error } = await this.client.from("gifts").update(SupabaseStore.giftRow(patch)).eq("id", id).select("*").maybeSingle();
      if (error) this.fail("gifts.update", error);
      return data ? SupabaseStore.gift(data) : null;
    },
    delete: async (id) => {
      const { data, error } = await this.client.from("gifts").delete().eq("id", id).select("id");
      if (error) this.fail("gifts.delete", error);
      return (data?.length ?? 0) > 0;
    },
    recordOpen: async (id, at) => {
      const { data } = await this.client.from("gifts").select("open_count, first_opened_at").eq("id", id).maybeSingle();
      if (!data) return;
      await this.client.from("gifts").update({ open_count: (data.open_count as number) + 1, first_opened_at: data.first_opened_at ?? at, last_opened_at: at }).eq("id", id);
    },
  };

  jobs: DataStore["jobs"] = {
    create: async (job) => {
      const { data, error } = await this.client.from("generation_jobs").insert(SupabaseStore.jobRow(job)).select("*").single();
      if (error) this.fail("jobs.create", error);
      return SupabaseStore.job(data);
    },
    get: async (id) => {
      const { data, error } = await this.client.from("generation_jobs").select("*").eq("id", id).maybeSingle();
      if (error) this.fail("jobs.get", error);
      return data ? SupabaseStore.job(data) : null;
    },
    getLatestForGift: async (giftId) => {
      const { data, error } = await this.client.from("generation_jobs").select("*").eq("gift_id", giftId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) this.fail("jobs.getLatestForGift", error);
      return data ? SupabaseStore.job(data) : null;
    },
    update: async (id, patch) => {
      const { data, error } = await this.client.from("generation_jobs").update(SupabaseStore.jobRow(patch)).eq("id", id).select("*").maybeSingle();
      if (error) this.fail("jobs.update", error);
      return data ? SupabaseStore.job(data) : null;
    },
    claim: async (id, leaseUntil, now) => {
      const { data, error } = await this.client.rpc("claim_generation_job", { p_job_id: id, p_lease_until: leaseUntil, p_now: now });
      if (error) this.fail("jobs.claim", error);
      const row = Array.isArray(data) ? data[0] : data;
      return row ? SupabaseStore.job(row as Record<string, unknown>) : null;
    },
    listDue: async (now, limit) => {
      const { data, error } = await this.client
        .from("generation_jobs")
        .select("*")
        .in("status", ["queued", "running"])
        .or(`lease_until.is.null,lease_until.lte.${now}`)
        .or(`next_run_at.is.null,next_run_at.lte.${now}`)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) this.fail("jobs.listDue", error);
      return (data ?? []).map(SupabaseStore.job);
    },
    listRecent: async (limit, status) => {
      let q = this.client.from("generation_jobs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) this.fail("jobs.listRecent", error);
      return (data ?? []).map(SupabaseStore.job);
    },
    countForOwnerSince: async (ownerId, sinceIso) => {
      const { count, error } = await this.client.from("generation_jobs").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).gte("created_at", sinceIso);
      if (error) this.fail("jobs.countForOwnerSince", error);
      return count ?? 0;
    },
  };

  orders: DataStore["orders"] = {
    create: async (order) => {
      const { data, error } = await this.client.from("orders").insert(SupabaseStore.orderRow(order)).select("*").single();
      if (error) this.fail("orders.create", error);
      return SupabaseStore.order(data);
    },
    get: async (id) => {
      const { data, error } = await this.client.from("orders").select("*").eq("id", id).maybeSingle();
      if (error) this.fail("orders.get", error);
      return data ? SupabaseStore.order(data) : null;
    },
    getByCheckoutSession: async (sessionId) => {
      const { data, error } = await this.client.from("orders").select("*").eq("stripe_checkout_session_id", sessionId).maybeSingle();
      if (error) this.fail("orders.getByCheckoutSession", error);
      return data ? SupabaseStore.order(data) : null;
    },
    listByOwner: async (ownerId) => {
      const { data, error } = await this.client.from("orders").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
      if (error) this.fail("orders.listByOwner", error);
      return (data ?? []).map(SupabaseStore.order);
    },
    listByGift: async (giftId) => {
      const { data, error } = await this.client.from("orders").select("*").eq("gift_id", giftId).order("created_at", { ascending: false });
      if (error) this.fail("orders.listByGift", error);
      return (data ?? []).map(SupabaseStore.order);
    },
    listAll: async (filter, limit = 200) => {
      let q = this.client.from("orders").select("*").order("created_at", { ascending: false }).limit(limit);
      if (filter?.status) q = q.eq("status", filter.status);
      if (filter?.physicalOnly) q = q.not("shipping_address", "is", null);
      const { data, error } = await q;
      if (error) this.fail("orders.listAll", error);
      return (data ?? []).map(SupabaseStore.order);
    },
    update: async (id, patch) => {
      const { data, error } = await this.client.from("orders").update(SupabaseStore.orderRow(patch)).eq("id", id).select("*").maybeSingle();
      if (error) this.fail("orders.update", error);
      return data ? SupabaseStore.order(data) : null;
    },
  };

  payments: DataStore["payments"] = {
    recordEvent: async (event) => {
      const { error } = await this.client.from("payment_events").insert({ id: event.id, provider: event.provider, type: event.type, order_id: event.orderId, amount_minor: event.amountMinor, currency: event.currency, received_at: event.receivedAt });
      if (error) {
        if (error.code === "23505") return { duplicate: true }; // unique_violation
        this.fail("payments.recordEvent", error);
      }
      return { duplicate: false };
    },
  };

  audit: DataStore["audit"] = {
    append: async (event) => {
      const { error } = await this.client.from("audit_events").insert({ id: event.id, at: event.at, actor_id: event.actorId, action: event.action, subject_type: event.subjectType, subject_id: event.subjectId, meta: event.meta });
      if (error) console.warn("[supabase] audit.append failed", error.message);
    },
    listRecent: async (limit) => {
      const { data, error } = await this.client.from("audit_events").select("*").order("at", { ascending: false }).limit(limit);
      if (error) this.fail("audit.listRecent", error);
      return (data ?? []).map((r) => ({ id: r.id as string, at: SupabaseStore.iso(r.at)!, actorId: (r.actor_id as string | null) ?? null, action: r.action as string, subjectType: r.subject_type as AuditEvent["subjectType"], subjectId: (r.subject_id as string | null) ?? null, meta: (r.meta as AuditEvent["meta"]) ?? {} }));
    },
  };

  emails: DataStore["emails"] = {
    create: async (d) => {
      const { error } = await this.client.from("email_deliveries").insert({ id: d.id, gift_id: d.giftId, order_id: d.orderId, to: d.to, template: d.template, provider: d.provider, status: d.status, provider_message_id: d.providerMessageId, error: d.error, created_at: d.createdAt });
      if (error) this.fail("emails.create", error);
      return d;
    },
    update: async (id, patch) => {
      const row: Record<string, unknown> = {};
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.providerMessageId !== undefined) row.provider_message_id = patch.providerMessageId;
      if (patch.error !== undefined) row.error = patch.error;
      const { data, error } = await this.client.from("email_deliveries").update(row).eq("id", id).select("*").maybeSingle();
      if (error) this.fail("emails.update", error);
      return data ? this.emailFromRow(data) : null;
    },
    listForGift: async (giftId) => {
      const { data, error } = await this.client.from("email_deliveries").select("*").eq("gift_id", giftId);
      if (error) this.fail("emails.listForGift", error);
      return (data ?? []).map((r) => this.emailFromRow(r));
    },
  };

  private emailFromRow(r: Record<string, unknown>): EmailDelivery {
    return { id: r.id as string, giftId: (r.gift_id as string | null) ?? null, orderId: (r.order_id as string | null) ?? null, to: r.to as string, template: r.template as string, provider: r.provider as string, status: r.status as EmailDelivery["status"], providerMessageId: (r.provider_message_id as string | null) ?? null, error: (r.error as string | null) ?? null, createdAt: SupabaseStore.iso(r.created_at)! };
  }

  rateLimit: DataStore["rateLimit"] = {
    hit: async (key, limit, windowMs, now = Date.now()) => {
      const { data, error } = await this.client.rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window_ms: windowMs, p_now: new Date(now).toISOString() });
      if (error) this.fail("rateLimit.hit", error);
      const row = (Array.isArray(data) ? data[0] : data) as { allowed: boolean; remaining: number; reset_at: string } | undefined;
      if (!row) return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
      return { allowed: row.allowed, remaining: row.remaining, resetAt: new Date(row.reset_at).getTime() };
    },
  };
}
