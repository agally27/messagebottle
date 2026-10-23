import { defineConfig } from "vitest/config";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "server-only": path.resolve(root, "src/test/server-only-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    clearMocks: true,
    env: { NODE_ENV: "test", DEMO_STEP_DELAY_MS: "0", DATA_BACKEND: "memory", SESSION_SECRET: "test-secret-test-secret-test-secret", PHYSICAL_PRODUCTS: "on" },
  },
});
