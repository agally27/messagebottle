import "server-only";
import path from "node:path";
import { env } from "@/lib/config/env";
import type { DataStore } from "./store";
import { LocalStore } from "./local-store";
import { SupabaseStore } from "./supabase-store";

export type { DataStore } from "./store";

declare global {
  var __mibStore: DataStore | undefined;
}

function createStore(): DataStore {
  switch (env.dataBackend) {
    case "supabase":
      return new SupabaseStore();
    case "memory":
      return new LocalStore(null);
    case "local":
    default: {
      if (env.isProduction && !env.demoMode) {
        console.warn("[data] Running the local JSON store in production. Data is per-instance and may be lost. Configure Supabase or set DEMO_MODE=true to acknowledge.");
      }
      return new LocalStore(path.resolve(/* turbopackIgnore: true */ process.cwd(), env.LOCAL_DATA_DIR));
    }
  }
}

/** Process-wide singleton (survives Next.js dev hot reloads via globalThis). */
export function getStore(): DataStore {
  if (!globalThis.__mibStore) globalThis.__mibStore = createStore();
  return globalThis.__mibStore;
}
