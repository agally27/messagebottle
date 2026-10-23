import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
// A second server from the same build with physical products switched off (the production default).
// Note: ISR pages (landing, pricing) are prerendered at build time, so they reflect the build's env.
const DIGITAL_PORT = PORT + 2;
const digitalURL = `http://127.0.0.1:${DIGITAL_PORT}`;
// Stand-in for the Resend API so email flows can be checked end to end without sending anything.
const MOCK_EMAIL_URL = `http://127.0.0.1:${PORT + 99}`;
// Use an explicitly provided Chromium, or the one pre-installed in Claude's cloud
// environment; otherwise Playwright's own download is used.
const preinstalled = "/opt/pw-browsers/chromium";
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (existsSync(preinstalled) ? preinstalled : undefined);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },
  projects: [
    // Needs the second local server, so it only runs when Playwright starts the servers itself.
    ...(process.env.E2E_BASE_URL ? [] : [{ name: "digital-only", testMatch: /digital-only\.spec\.ts/, use: { ...devices["Desktop Chrome"], baseURL: digitalURL, ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}) } }]),
    { name: "mobile", testIgnore: /digital-only\.spec\.ts/, use: { ...devices["iPhone 13"], browserName: "chromium", ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}) } },
    { name: "desktop", testIgnore: /digital-only\.spec\.ts/, use: { ...devices["Desktop Chrome"], ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}) } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        { command: `node e2e/mock-resend.mjs ${PORT + 99}`, url: MOCK_EMAIL_URL, reuseExistingServer: !process.env.CI, timeout: 10_000 },
        { command: `pnpm start -p ${PORT}`, url: baseURL, reuseExistingServer: !process.env.CI, timeout: 120_000, env: { ...serverEnv(baseURL, "on"), RESEND_API_KEY: "re_e2e_key", RESEND_API_URL: MOCK_EMAIL_URL, EMAIL_FROM: "Message in a Bottle <e2e@example.test>" } },
        { command: `pnpm start -p ${DIGITAL_PORT}`, url: digitalURL, reuseExistingServer: !process.env.CI, timeout: 120_000, env: serverEnv(digitalURL, "off") },
      ],
});

function serverEnv(url: string, physical: "on" | "off"): Record<string, string> {
  return {
    ...(process.env as Record<string, string>),
    DATA_BACKEND: "memory",
    NEXT_PUBLIC_APP_URL: url,
    DEMO_MODE: "true",
    DEMO_ADMIN_SECRET: "e2e-demo-admin-secret",
    SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-only-session-secret-not-for-production-use",
    PHYSICAL_PRODUCTS: physical,
  };
}
