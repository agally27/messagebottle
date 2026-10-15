import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Private binary storage for gift media (photos). Never publicly addressable. */
export interface MediaStore {
  readonly kind: "memory" | "local" | "supabase";
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  delete(keys: string[]): Promise<void>;
}

const SAFE_KEY = /^[a-z0-9/_-]+\.(jpg|png|webp)$/;
function assertKey(key: string) {
  if (!SAFE_KEY.test(key) || key.includes("..")) throw new Error("invalid media key");
}

export class MemoryMediaStore implements MediaStore {
  readonly kind = "memory" as const;
  private files = new Map<string, { data: Buffer; contentType: string }>();
  async put(key: string, data: Buffer, contentType: string) {
    assertKey(key);
    this.files.set(key, { data, contentType });
  }
  async get(key: string) {
    assertKey(key);
    return this.files.get(key) ?? null;
  }
  async delete(keys: string[]) {
    for (const k of keys) this.files.delete(k);
  }
  /** Test helper. */
  has(key: string) {
    return this.files.has(key);
  }
}

export class LocalMediaStore implements MediaStore {
  readonly kind = "local" as const;
  constructor(private dir: string) {}
  private file(key: string) {
    assertKey(key);
    return path.join(this.dir, key);
  }
  async put(key: string, data: Buffer, contentType: string) {
    const f = this.file(key);
    await mkdir(path.dirname(f), { recursive: true });
    await writeFile(f, data);
    await writeFile(`${f}.type`, contentType);
  }
  async get(key: string) {
    const f = this.file(key);
    try {
      const [data, contentType] = await Promise.all([readFile(f), readFile(`${f}.type`, "utf8").catch(() => "image/jpeg")]);
      return { data, contentType };
    } catch {
      return null;
    }
  }
  async delete(keys: string[]) {
    for (const k of keys) {
      const f = this.file(k);
      await rm(f, { force: true });
      await rm(`${f}.type`, { force: true });
    }
  }
}

/** Supabase Storage (private bucket); accessed only with the server's secret key. */
export class SupabaseMediaStore implements MediaStore {
  readonly kind = "supabase" as const;
  private client: SupabaseClient;
  constructor(url: string, secretKey: string, private bucket: string) {
    this.client = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  async put(key: string, data: Buffer, contentType: string) {
    assertKey(key);
    const { error } = await this.client.storage.from(this.bucket).upload(key, data, { contentType, upsert: true, cacheControl: "3600" });
    if (error) throw new Error(`[storage] upload failed: ${error.message}`);
  }
  async get(key: string) {
    assertKey(key);
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error || !data) return null;
    return { data: Buffer.from(await data.arrayBuffer()), contentType: data.type || "image/jpeg" };
  }
  async delete(keys: string[]) {
    if (!keys.length) return;
    const { error } = await this.client.storage.from(this.bucket).remove(keys);
    if (error) console.warn("[storage] delete failed", error.message);
  }
}
