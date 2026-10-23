import { expect, test } from "@playwright/test";

/**
 * Runs against a server with PHYSICAL_PRODUCTS=off (the production default):
 * only the digital gift is offered, and physical products can't be bought
 * even by editing a URL.
 */

test("marketing offers the digital gift and says bottles are coming soon", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Digital Gift" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Keepsake bottles" })).toBeVisible();
  await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
  for (const name of ["Little Bottle", "Keepsake Gift Box", "Memory Bottle", "Christmas Bottle"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(0);
  }
  await expect(page.getByText(/UK delivery/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /start with the little bottle/i })).toHaveCount(0);
});

test("a stale bottle link still creates and sells only the digital gift", async ({ page }) => {
  await page.goto("/create?occasion=birthday&product=little-bottle");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/their first name/i).fill("Maya");
  await page.getByLabel(/who they are to you/i).fill("my sister");
  await page.getByLabel(/your name, as you'd sign it/i).fill("Tom");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Your message", { exact: true }).fill("Happy birthday, Maya. You have always been the brave one, and I am so proud of you. Here's to the year ahead.");
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /ready to create it/i })).toBeVisible();
  await expect(page.getByText(/little bottle/i)).toHaveCount(0);
  await expect(page.getByText(/prices from £4\.99/i)).toBeVisible();
  await page.getByRole("button", { name: /create my gift/i }).click();
  await expect(page).toHaveURL(/\/gifts\/[0-9a-f-]+$/, { timeout: 60_000 });
  const giftId = page.url().split("/").pop()!;

  await expect(page.getByRole("link", { name: /add a physical bottle/i })).toHaveCount(0);
  await page.getByRole("link", { name: /continue to checkout/i }).click();
  await expect(page).toHaveURL(new RegExp(`/checkout/${giftId}`));
  await expect(page.getByRole("heading", { name: "Digital Gift" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByText(/delivery address/i)).toHaveCount(0);

  // Hand-edited URLs fall back to the digital gift.
  await page.goto(`/gifts/${giftId}/send`);
  await expect(page).toHaveURL(new RegExp(`/checkout/${giftId}\\?product=digital`));
  await page.goto(`/checkout/${giftId}?product=memory-bottle`);
  await expect(page.getByRole("heading", { name: "Digital Gift" })).toBeVisible();

  await page.getByRole("button", { name: /continue \(demo payment\)/i }).click();
  await page.getByRole("button", { name: /confirm demo payment of £4\.99/i }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+/);
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
});
