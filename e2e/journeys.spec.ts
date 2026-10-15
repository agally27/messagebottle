import { expect, test, type Page } from "@playwright/test";

/**
 * Critical user journeys against a production build in demo mode
 * (memory store, local story writer, demo activation).
 */

/** Option cards use a visually hidden native radio; select it the way a user does, via its label. */
async function choose(page: Page, name: RegExp) {
  const radio = page.getByRole("radio", { name });
  await radio.locator("xpath=ancestor::label[1]").click();
  await expect(radio).toBeChecked();
}

/** With SHOTS=1, saves screenshots of key screens to test-results/shots/<project>/. */
async function shot(page: Page, name: string) {
  if (!process.env.SHOTS) return;
  const project = test.info().project.name;
  await page.screenshot({ path: `test-results/shots/${project}/${name}.png`, fullPage: true });
}

async function fillWizard(page: Page, opts: { recipient?: string; sender?: string } = {}) {
  const recipient = opts.recipient ?? "Maya";
  const sender = opts.sender ?? "Tom";
  await page.goto("/create?occasion=birthday");
  await expect(page.getByRole("heading", { name: /what's the occasion/i })).toBeVisible();
  await expect(page.getByRole("radio", { name: /birthday/i })).toBeChecked();
  await shot(page, "wizard-1-occasion");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: /who is this for/i })).toBeVisible();
  // Validation: continue with empty fields shows errors and stays on the step.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await page.getByLabel(/their first name/i).fill(recipient);
  await page.getByLabel(/who they are to you/i).fill("my sister");
  await page.getByLabel(/your name, as you'd sign it/i).fill(sender);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: new RegExp(`what do you want ${recipient} to know`, "i") })).toBeVisible();
  await page.getByLabel("Your message", { exact: true }).fill(
    `Happy birthday, ${recipient}. You have always been the brave one. I watched you move cities and start again, and make it look easy. It was not easy, and I am so proud of you. Here's to the year ahead.`,
  );
  await page.getByLabel(/a memory or detail/i).fill("The night we got lost in Lisbon and found the best pastel de nata of our lives.");
  await shot(page, "wizard-3-message");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: /choose the look/i })).toBeVisible();
  await choose(page, /watercolour memories/i);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: /choose the sound/i })).toBeVisible();
  await choose(page, /gentle piano/i);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: /ready to create it/i })).toBeVisible();
  await expect(page.getByText(recipient, { exact: false }).first()).toBeVisible();
  await shot(page, "wizard-6-review");
}

test.describe("marketing", () => {
  test("landing page loads with the primary call to action", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/feeling/i);
    await expect(page.getByRole("link", { name: "Create your gift" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open an example/i }).first()).toBeVisible();
    await expect(page.getByText(/£4\.99/)).toBeVisible();
  });

  test("example gift can be opened and read to the end", async ({ page }) => {
    await page.goto("/example");
    await expect(page.getByRole("heading", { name: /someone has a message for you/i })).toBeVisible();
    await page.getByRole("button", { name: /open the bottle/i }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Eleanor/, { timeout: 10_000 });
    // Walk through every part.
    for (let i = 0; i < 12; i++) {
      const finish = page.getByRole("button", { name: "Finish" });
      if (await finish.isVisible()) {
        await finish.click();
        break;
      }
      await page.getByRole("button", { name: "Next" }).click();
    }
    await expect(page.getByRole("button", { name: /read it again/i })).toBeVisible();
    await expect(page.getByText(/Whitby/)).toBeVisible();
  });
});

test.describe("sender journey", () => {
  test("create → generate → preview → activate → recipient opens → revoke", async ({ page, browser }) => {
    await fillWizard(page);
    await page.getByRole("button", { name: /create my gift/i }).click();

    await expect(page).toHaveURL(/\/gifts\/[0-9a-f-]+\/generating/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /making your gift/i })).toBeVisible();
    await expect(page.getByText(/demo generation/i)).toBeVisible();
    await shot(page, "generating");

    // Generation completes and we land on the gift page.
    await expect(page).toHaveURL(/\/gifts\/[0-9a-f-]+$/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /for maya/i })).toBeVisible();
    await expect(page.getByText(/ready to send/i).first()).toBeVisible();
    const giftUrl = page.url();
    await shot(page, "gift-ready");

    // The sender's preview shows the story, and the recipient's name is in it.
    const preview = page.locator('[data-stage="closed"]');
    await expect(preview).toBeVisible();
    await expect(preview.getByText(/for maya/i)).toBeVisible();

    // Edit the title and save; the page reflects it.
    await page.getByLabel("Title", { exact: true }).fill("A birthday letter for Maya");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/^Saved\./)).toBeVisible();

    // Activate in demo mode and grab the private link.
    await page.getByRole("button", { name: /activate link/i }).click();
    await expect(page.getByText(/your gift is live/i)).toBeVisible({ timeout: 15_000 });
    const fullLink = await page.getByLabel("Private gift link").inputValue();
    expect(fullLink).toMatch(/\/g\/[A-Za-z0-9_-]{40,}$/);
    // The link carries the public origin (NEXT_PUBLIC_APP_URL); test against this server.
    const link = new URL(fullLink).pathname;
    await shot(page, "gift-active");

    // A recipient with no session opens the link and reads the story.
    const recipient = await browser.newContext();
    const rp = await recipient.newPage();
    await rp.goto(link);
    await expect(rp.getByRole("heading", { name: /someone has a message for you/i })).toBeVisible();
    await expect(rp.getByText(/From Tom/)).toBeVisible();
    await shot(rp, "recipient-closed");
    await rp.getByRole("button", { name: /open the bottle/i }).click();
    await expect(rp.getByRole("heading", { name: /a birthday letter for maya/i })).toBeVisible({ timeout: 10_000 });
    await shot(rp, "recipient-message");
    await rp.getByRole("button", { name: "Next" }).click();
    await expect(rp.getByText(/brave one/i)).toBeVisible();
    await shot(rp, "recipient-scene");
    // No sender account data in the page.
    const html = await rp.content();
    expect(html).not.toContain("ownerId");
    expect(html).not.toContain("/gifts/");
    await recipient.close();

    // Another signed-in user cannot open the sender's gift page.
    const stranger = await browser.newContext();
    const sp = await stranger.newPage();
    await sp.goto(giftUrl);
    await expect(sp).toHaveURL(/\/login/);
    await sp.getByLabel(/your name/i).fill("Mallory");
    await sp.getByRole("button", { name: /continue as guest/i }).click();
    await expect(sp).toHaveURL(/\/gifts\//);
    await expect(sp.getByRole("heading", { name: /drifted away/i })).toBeVisible();
    // Same-origin fetch from the page so the session cookie is sent.
    const apiStatus = await sp.evaluate(async (u) => (await fetch(u, { cache: "no-store" })).status, giftUrl.replace(/\/gifts\/([^/]+)$/, "/api/gifts/$1/job"));
    expect(apiStatus).toBe(404);
    await stranger.close();

    // Revoking the link makes it unavailable.
    await page.getByRole("button", { name: /revoke link/i }).click();
    await page.getByRole("button", { name: /yes, revoke/i }).click();
    await expect(page.getByText(/link revoked/i).first()).toBeVisible();
    const after = await browser.newContext();
    const ap = await after.newPage();
    await ap.goto(link);
    await expect(ap.getByRole("heading", { name: /isn't available/i })).toBeVisible();
    await after.close();

    // Dashboard lists the gift.
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /for maya/i })).toBeVisible();
    await shot(page, "dashboard");
  });

  test("draft survives a reload mid-wizard", async ({ page }) => {
    await page.goto("/create");
    await choose(page, /friendship/i);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel(/their first name/i).fill("Priya");
    await page.waitForTimeout(400); // debounced save
    await page.reload();
    await expect(page.getByLabel(/their first name/i)).toHaveValue("Priya");
  });
});

test.describe("recipient safety", () => {
  test("invalid and malformed links are handled safely", async ({ page }) => {
    await page.goto("/g/not-a-real-token");
    await expect(page.getByRole("heading", { name: /isn't available/i })).toBeVisible();
    const res = await page.request.get("/g/" + "A".repeat(43));
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("isn");
  });

  test("private pages require sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test("login never redirects off-site", async ({ page }) => {
    await page.goto("/login?next=//evil.example");
    await page.getByLabel(/your name/i).fill("Eve");
    await page.getByRole("button", { name: /continue as guest/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("commerce (demo checkout)", () => {
  test("digital order → demo payment → order paid → link live; physical order fulfilled by admin", async ({ page, browser }) => {
    await fillWizard(page, { recipient: "Priya", sender: "Sam" });
    await page.getByRole("button", { name: /create my gift/i }).click();
    await expect(page).toHaveURL(/\/gifts\/[0-9a-f-]+$/, { timeout: 60_000 });
    const giftId = page.url().split("/").pop()!;

    // Digital gift through the demo checkout.
    await page.getByRole("link", { name: /choose a gift & checkout/i }).click();
    await expect(page).toHaveURL(new RegExp(`/gifts/${giftId}/send`));
    await page.getByRole("link", { name: "Continue" }).first().click();
    await expect(page).toHaveURL(new RegExp(`/checkout/${giftId}`));
    await choose(page, /^digital gift/i);
    await expect(page.getByText(/total/i).first()).toBeVisible();
    await page.getByRole("button", { name: /continue \(demo payment\)/i }).click();
    await expect(page).toHaveURL(/\/checkout\/[0-9a-f-]+\/demo\/[0-9a-f-]+/);
    await expect(page.getByText(/nothing is charged/i)).toBeVisible();
    await shot(page, "checkout-demo");
    await page.getByRole("button", { name: /confirm demo payment of £4\.99/i }).click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { name: /thank you/i })).toBeVisible();
    await expect(page.getByText("Paid", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Private gift link")).toBeVisible();
    await shot(page, "order-paid");

    // Physical add-on with a UK address.
    await page.goto(`/checkout/${giftId}?product=little-bottle`);
    await expect(page.getByRole("radio", { name: /little bottle/i })).toBeChecked();
    await page.getByRole("button", { name: /continue \(demo payment\)/i }).click();
    await expect(page.getByRole("alert").first()).toBeVisible(); // address required
    await page.getByLabel("Name", { exact: true }).fill("Priya S");
    await page.getByLabel(/address line 1/i).fill("1 Harbour Lane");
    await page.getByLabel(/town or city/i).fill("Whitby");
    await page.getByLabel(/postcode/i).fill("yo21 1aa");
    await page.getByRole("button", { name: /continue \(demo payment\)/i }).click();
    await page.getByRole("button", { name: /confirm demo payment of £20\.94/i }).click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+/);
    await expect(page.getByText(/we'll start making your keepsake/i)).toBeVisible();
    const orderUrl = page.url();
    const orderId = orderUrl.split("/").pop()!;

    // Print-ready insert renders the original message and a QR code.
    await page.goto(`/gifts/${giftId}/print`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/brave one/i)).toBeVisible();
    await expect(page.getByRole("img", { name: /qr code/i })).toBeVisible();
    const qr = await page.evaluate(async (id) => (await fetch(`/api/gifts/${id}/qr`)).headers.get("content-type"), giftId);
    expect(qr).toBe("image/png");

    // A non-admin cannot see the admin area.
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: /drifted away/i })).toBeVisible();

    // An admin (demo: guest named "admin") fulfils the physical order.
    const adminCtx = await browser.newContext();
    const ap = await adminCtx.newPage();
    await ap.goto("/login?next=%2Fadmin%2Forders");
    await ap.getByLabel(/your name/i).fill("Ops");
    await ap.getByText("Operator sign-in").click();
    await ap.getByLabel(/demo admin secret/i).fill("e2e-demo-admin-secret");
    await ap.getByRole("button", { name: /continue as guest/i }).click();
    await expect(ap).toHaveURL(/\/admin\/orders/);
    await ap.goto(`/admin/orders/${orderId}`);
    await expect(ap.getByText(/1 Harbour Lane/)).toBeVisible();
    await ap.getByLabel("Status", { exact: true }).selectOption("printing");
    await ap.getByRole("button", { name: "Save" }).click();
    await expect(ap.getByText(/^Saved\./)).toBeVisible();
    await ap.getByLabel("Status", { exact: true }).selectOption("dispatched");
    await ap.getByLabel(/carrier/i).fill("Royal Mail");
    await ap.getByLabel(/tracking number/i).fill("RM123456789GB");
    await ap.getByRole("button", { name: "Save" }).click();
    await expect(ap.getByText(/^Saved\./)).toBeVisible();
    await shot(ap, "admin-order");
    await adminCtx.close();

    // The sender sees the dispatch status.
    await page.goto(orderUrl);
    await expect(page.getByText(/dispatched with royal mail/i)).toBeVisible();
    await expect(page.getByText(/RM123456789GB/)).toBeVisible();
  });
});
