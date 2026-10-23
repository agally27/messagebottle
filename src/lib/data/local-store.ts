import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DataStore } from "./store";
import type {
  AuditEvent,
  EmailDelivery,
  GenerationJob,
  Gift,
  Order,
  PaymentEvent,
  ScheduledDelivery,
  UserProfile,
} from "@/lib/domain/types";
import { nowIso } from "@/lib/utils/ids";

interface Db {
  version: 1;
  users: Record<string, UserProfile>;
  gifts: Record<string, Gift>;
  jobs: Record<string, GenerationJob>;
  orders: Record<string, Order>;
  payments: Record<string, PaymentEvent>;
  audit: AuditEvent[];
  emails: Record<string, EmailDelivery>;
  deliveries: Record<string, ScheduledDelivery>;
  rateLimits: Record<string, { count: number; resetAt: number }>;
}

function emptyDb(): Db {
  return { version: 1, users: {}, gifts: {}, jobs: {}, orders: {}, payments: {}, audit: [], emails: {}, deliveries: {}, rateLimits: {} };
}

const clone = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));

/**
 * Local store: a single JSON document, persisted to disk (debounced, atomic
 * rename) when a directory is given, or kept in memory only. Single-process.
 * Suitable for development, demos and tests — never for production traffic.
 */
export class LocalStore implements DataStore {
  readonly kind: "local" | "memory";
  private db: Db = emptyDb();
  private file: string | null;
  private loaded: Promise<void> | null = null;
  private writeTimer: NodeJS.Timeout | null = null;
  private writing: Promise<void> = Promise.resolve();
  private persistFailed = false;

  constructor(dir: string | null) {
    this.kind = dir ? "local" : "memory";
    this.file = dir ? path.join(dir, "db.json") : null;
  }

  private async ensureLoaded() {
    if (!this.file) return;
    if (!this.loaded) {
      this.loaded = (async () => {
        try {
          const text = await readFile(this.file!, "utf8");
          const parsed = JSON.parse(text) as Db;
          if (parsed && parsed.version === 1) this.db = { ...emptyDb(), ...parsed };
        } catch {
          // No file yet or unreadable: start empty.
        }
      })();
    }
    await this.loaded;
  }

  private schedulePersist() {
    if (!this.file || this.persistFailed) return;
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => void this.persistNow(), 150);
  }

  async persistNow(): Promise<void> {
    if (!this.file || this.persistFailed) return;
    const file = this.file;
    const snapshot = JSON.stringify(this.db);
    this.writing = this.writing.then(async () => {
      try {
        await mkdir(path.dirname(file), { recursive: true });
        const tmp = `${file}.${process.pid}.tmp`;
        await writeFile(tmp, snapshot, "utf8");
        await rename(tmp, file);
      } catch (err) {
        this.persistFailed = true;
        console.warn("[data] local store cannot persist to disk; continuing in memory only", err instanceof Error ? err.message : err);
      }
    });
    await this.writing;
  }

  /** Test helper. */
  async reset() {
    this.db = emptyDb();
    this.schedulePersist();
  }

  users: DataStore["users"] = {
    get: async (id) => {
      await this.ensureLoaded();
      return clone(this.db.users[id] ?? null);
    },
    findByEmail: async (email) => {
      await this.ensureLoaded();
      const e = email.toLowerCase();
      return clone(Object.values(this.db.users).find((u) => u.email?.toLowerCase() === e) ?? null);
    },
    upsert: async (user) => {
      await this.ensureLoaded();
      this.db.users[user.id] = clone(user);
      this.schedulePersist();
      return clone(user);
    },
  };

  gifts: DataStore["gifts"] = {
    create: async (gift) => {
      await this.ensureLoaded();
      if (this.db.gifts[gift.id]) throw new Error("gift exists");
      this.db.gifts[gift.id] = clone(gift);
      this.schedulePersist();
      return clone(gift);
    },
    get: async (id) => {
      await this.ensureLoaded();
      return clone(this.db.gifts[id] ?? null);
    },
    getByPublicToken: async (token) => {
      await this.ensureLoaded();
      return clone(Object.values(this.db.gifts).find((g) => g.publicToken === token) ?? null);
    },
    listByOwner: async (ownerId) => {
      await this.ensureLoaded();
      return clone(
        Object.values(this.db.gifts)
          .filter((g) => g.ownerId === ownerId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );
    },
    update: async (id, patch) => {
      await this.ensureLoaded();
      const current = this.db.gifts[id];
      if (!current) return null;
      const next = { ...current, ...clone(patch), id, updatedAt: new Date().toISOString() };
      this.db.gifts[id] = next;
      this.schedulePersist();
      return clone(next);
    },
    delete: async (id) => {
      await this.ensureLoaded();
      if (!this.db.gifts[id]) return false;
      delete this.db.gifts[id];
      for (const [jid, j] of Object.entries(this.db.jobs)) if (j.giftId === id) delete this.db.jobs[jid];
      for (const [did, d] of Object.entries(this.db.deliveries)) if (d.giftId === id) delete this.db.deliveries[did];
      this.schedulePersist();
      return true;
    },
    recordOpen: async (id, at) => {
      await this.ensureLoaded();
      const g = this.db.gifts[id];
      if (!g) return;
      g.openCount += 1;
      g.firstOpenedAt ??= at;
      g.lastOpenedAt = at;
      this.schedulePersist();
    },
    listAbandoned: async (beforeIso, limit) => {
      await this.ensureLoaded();
      return clone(
        Object.values(this.db.gifts)
          .filter((g) => (g.status === "draft" || g.status === "failed") && g.updatedAt < beforeIso)
          .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
          .slice(0, limit),
      );
    },
  };

  jobs: DataStore["jobs"] = {
    create: async (job) => {
      await this.ensureLoaded();
      this.db.jobs[job.id] = clone(job);
      this.schedulePersist();
      return clone(job);
    },
    get: async (id) => {
      await this.ensureLoaded();
      return clone(this.db.jobs[id] ?? null);
    },
    getLatestForGift: async (giftId) => {
      await this.ensureLoaded();
      const list = Object.values(this.db.jobs)
        .filter((j) => j.giftId === giftId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return clone(list[0] ?? null);
    },
    update: async (id, patch) => {
      await this.ensureLoaded();
      const current = this.db.jobs[id];
      if (!current) return null;
      const next = { ...current, ...clone(patch), id, updatedAt: new Date().toISOString() };
      this.db.jobs[id] = next;
      this.schedulePersist();
      return clone(next);
    },
    claim: async (id, leaseUntil, now) => {
      await this.ensureLoaded();
      const j = this.db.jobs[id];
      if (!j) return null;
      if (j.status !== "queued" && j.status !== "running") return null;
      if (j.leaseUntil && j.leaseUntil > now) return null;
      if (j.nextRunAt && j.nextRunAt > now) return null;
      j.leaseUntil = leaseUntil;
      j.status = "running";
      j.startedAt ??= now;
      j.updatedAt = now;
      this.schedulePersist();
      return clone(j);
    },
    listDue: async (now, limit) => {
      await this.ensureLoaded();
      return clone(
        Object.values(this.db.jobs)
          .filter((j) => (j.status === "queued" || j.status === "running") && (!j.leaseUntil || j.leaseUntil <= now) && (!j.nextRunAt || j.nextRunAt <= now))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .slice(0, limit),
      );
    },
    listRecent: async (limit, status) => {
      await this.ensureLoaded();
      return clone(
        Object.values(this.db.jobs)
          .filter((j) => !status || j.status === status)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, limit),
      );
    },
    countForOwnerSince: async (ownerId, sinceIso) => {
      await this.ensureLoaded();
      return Object.values(this.db.jobs).filter((j) => j.ownerId === ownerId && j.createdAt >= sinceIso).length;
    },
  };

  orders: DataStore["orders"] = {
    create: async (order) => {
      await this.ensureLoaded();
      this.db.orders[order.id] = clone(order);
      this.schedulePersist();
      return clone(order);
    },
    get: async (id) => {
      await this.ensureLoaded();
      return clone(this.db.orders[id] ?? null);
    },
    getByCheckoutSession: async (sessionId) => {
      await this.ensureLoaded();
      return clone(Object.values(this.db.orders).find((o) => o.stripeCheckoutSessionId === sessionId) ?? null);
    },
    getByPaymentIntent: async (paymentIntentId) => {
      await this.ensureLoaded();
      return clone(Object.values(this.db.orders).find((o) => o.stripePaymentIntentId === paymentIntentId) ?? null);
    },
    listByOwner: async (ownerId) => {
      await this.ensureLoaded();
      return clone(Object.values(this.db.orders).filter((o) => o.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    listByGift: async (giftId) => {
      await this.ensureLoaded();
      return clone(Object.values(this.db.orders).filter((o) => o.giftId === giftId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    listAll: async (filter, limit = 200) => {
      await this.ensureLoaded();
      return clone(
        Object.values(this.db.orders)
          .filter((o) => (!filter?.status || o.status === filter.status) && (!filter?.physicalOnly || o.shippingAddress !== null))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, limit),
      );
    },
    update: async (id, patch) => {
      await this.ensureLoaded();
      const current = this.db.orders[id];
      if (!current) return null;
      const next = { ...current, ...clone(patch), id, updatedAt: new Date().toISOString() };
      this.db.orders[id] = next;
      this.schedulePersist();
      return clone(next);
    },
  };

  payments: DataStore["payments"] = {
    recordEvent: async (event) => {
      await this.ensureLoaded();
      if (this.db.payments[event.id]) return { duplicate: true };
      this.db.payments[event.id] = clone(event);
      this.schedulePersist();
      return { duplicate: false };
    },
    deleteEvent: async (id) => {
      await this.ensureLoaded();
      delete this.db.payments[id];
      this.schedulePersist();
    },
  };

  audit: DataStore["audit"] = {
    append: async (event) => {
      await this.ensureLoaded();
      this.db.audit.push(clone(event));
      if (this.db.audit.length > 5000) this.db.audit.splice(0, this.db.audit.length - 5000);
      this.schedulePersist();
    },
    listRecent: async (limit) => {
      await this.ensureLoaded();
      return clone(this.db.audit.slice(-limit).reverse());
    },
  };

  emails: DataStore["emails"] = {
    create: async (d) => {
      await this.ensureLoaded();
      this.db.emails[d.id] = clone(d);
      this.schedulePersist();
      return clone(d);
    },
    update: async (id, patch) => {
      await this.ensureLoaded();
      const current = this.db.emails[id];
      if (!current) return null;
      const next = { ...current, ...clone(patch), id };
      this.db.emails[id] = next;
      this.schedulePersist();
      return clone(next);
    },
    listForGift: async (giftId) => {
      await this.ensureLoaded();
      return clone(Object.values(this.db.emails).filter((e) => e.giftId === giftId));
    },
  };

  deliveries: DataStore["deliveries"] = {
    create: async (d) => {
      await this.ensureLoaded();
      this.db.deliveries[d.id] = clone(d);
      this.schedulePersist();
      return clone(d);
    },
    get: async (id) => {
      await this.ensureLoaded();
      return clone(this.db.deliveries[id] ?? null);
    },
    listByGift: async (giftId) => {
      await this.ensureLoaded();
      return clone(Object.values(this.db.deliveries).filter((d) => d.giftId === giftId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    update: async (id, patch) => {
      await this.ensureLoaded();
      const current = this.db.deliveries[id];
      if (!current) return null;
      const next = { ...current, ...clone(patch), id, updatedAt: nowIso() };
      this.db.deliveries[id] = next;
      this.schedulePersist();
      return clone(next);
    },
    listDue: async (now, limit) => {
      await this.ensureLoaded();
      return clone(
        Object.values(this.db.deliveries)
          .filter((d) => d.status === "scheduled" && d.sendAt <= now)
          .sort((a, b) => a.sendAt.localeCompare(b.sendAt))
          .slice(0, limit),
      );
    },
    claim: async (id, now) => {
      await this.ensureLoaded();
      const d = this.db.deliveries[id];
      if (!d || d.status !== "scheduled" || d.sendAt > now) return null;
      d.status = "sending";
      d.updatedAt = now;
      this.schedulePersist();
      return clone(d);
    },
  };

  rateLimit: DataStore["rateLimit"] = {
    hit: async (key, limit, windowMs, now = Date.now()) => {
      await this.ensureLoaded();
      const entry = this.db.rateLimits[key];
      if (!entry || entry.resetAt <= now) {
        this.db.rateLimits[key] = { count: 1, resetAt: now + windowMs };
        this.schedulePersist();
        return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
      }
      if (entry.count >= limit) return { allowed: false, remaining: 0, resetAt: entry.resetAt };
      entry.count += 1;
      this.schedulePersist();
      return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
    },
  };
}
