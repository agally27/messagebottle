import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

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
    { name: "mobile", use: { ...devices["iPhone 13"], ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}) } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}) } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          DATA_BACKEND: "memory",
          DEMO_MODE: "true",
          SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-only-session-secret-not-for-production-use",
        },
      },
});
