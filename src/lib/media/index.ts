import "server-only";
import path from "node:path";
import { env } from "@/lib/config/env";
import { LocalMediaStore, MemoryMediaStore, SupabaseMediaStore, type MediaStore } from "./store";

export type { MediaStore } from "./store";

declare global {
  var __mibMedia: MediaStore | undefined;
}

export function getMediaStore(): MediaStore {
  if (globalThis.__mibMedia) return globalThis.__mibMedia;
  let store: MediaStore;
  if (env.dataBackend === "supabase" && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SECRET_KEY) {
    store = new SupabaseMediaStore(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, env.SUPABASE_STORAGE_BUCKET);
  } else if (env.dataBackend === "memory") {
    store = new MemoryMediaStore();
  } else {
    store = new LocalMediaStore(path.resolve(/* turbopackIgnore: true */ process.cwd(), env.LOCAL_DATA_DIR, "media"));
  }
  globalThis.__mibMedia = store;
  return store;
}
