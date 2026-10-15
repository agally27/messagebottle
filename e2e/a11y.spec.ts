import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated accessibility scan (axe-core) on the main public and app screens.
 * Only WCAG A/AA rules; serious and critical violations fail the test.
 * Runs with reduced motion so entrance animations (which briefly lower
 * contrast by design) don't distort the contrast measurement.
 */
test.use({ contextOptions: { reducedMotion: "reduce" } });
const PAGES: Array<{ path: string; name: string }> = [
  { path: "/", name: "landing" },
  { path: "/pricing", name: "pricing" },
  { path: "/create", name: "wizard" },
  { path: "/login", name: "login" },
  { path: "/example", name: "example (closed)" },
  { path: "/support", name: "support" },
];

for (const p of PAGES) {
  test(`axe: ${p.name}`, async ({ page }) => {
    await page.goto(p.path);
    await page.waitForLoadState("load");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes) ${v.nodes[0]?.target.join(" ")}`), "serious/critical axe violations").toEqual([]);
  });
}

test("axe: example gift opened", async ({ page }) => {
  await page.goto("/example");
  await page.getByRole("button", { name: /open the bottle/i }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Eleanor/, { timeout: 10_000 });
  await page.getByRole("button", { name: "Next" }).click();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
});
