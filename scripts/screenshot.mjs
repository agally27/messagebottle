// Visual check helper: node scripts/screenshot.mjs [--base URL] [--paths /,/pricing] [--out dir] [--viewport]
// Uses the Playwright-installed Chromium (or PLAYWRIGHT_CHROMIUM_PATH).
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]] : [])).filter((x) => x.length));
const base = args.base ?? "http://127.0.0.1:3000";
const paths = (args.paths ?? "/").split(",");
const out = args.out ?? "test-results/shots";
const fullPage = args.viewport === undefined;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
for (const [name, opts] of [["mobile", devices["iPhone 13"]], ["desktop", { viewport: { width: 1360, height: 900 } }]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "load" });
    // Scroll through the page so scroll-triggered reveals have fired, then return to the top.
    if (fullPage) {
      await page.waitForTimeout(1200); // let hydration attach observers first
      await page.evaluate(async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const step = Math.max(240, window.innerHeight * 0.4);
        const max = document.documentElement.scrollHeight;
        for (let y = 0; y <= max; y += step) {
          window.scrollTo(0, y);
          await sleep(180);
        }
        window.scrollTo(0, max);
        await sleep(500);
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1400);
      if (process.env.DEBUG_REVEAL) {
        const hidden = await page.evaluate(() => [...document.querySelectorAll(".reveal:not(.reveal-in)")].map((e) => `${e.tagName}.${[...e.classList].slice(0, 3).join(".")} y=${Math.round(e.getBoundingClientRect().top + window.scrollY)} opacity=${getComputedStyle(e).opacity}`));
        const shown = await page.evaluate(() => [...document.querySelectorAll(".reveal.reveal-in")].map((e) => `${e.tagName} y=${Math.round(e.getBoundingClientRect().top + window.scrollY)} opacity=${getComputedStyle(e).opacity}`));
        console.log(name, "hidden:", hidden, "shown:", shown.slice(-4), "scrollHeight:", await page.evaluate(() => document.body.scrollHeight), "docHeight:", await page.evaluate(() => document.documentElement.scrollHeight));
      }
    } else {
      await page.waitForTimeout(400);
    }
    const file = `${out}/${name}${p.replace(/[^a-z0-9]+/gi, "_") || "_root"}.png`;
    await page.screenshot({ path: file, fullPage });
    console.log("wrote", file);
  }
  await ctx.close();
}
await browser.close();
