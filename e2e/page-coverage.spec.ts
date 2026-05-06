import { test, expect } from "@playwright/test";

async function setupBaseMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: { id: "e2e", name: "E2E", email: "e2e@t.com", credits: 100 } }),
    });
  });
}

test.describe("Blog pages", () => {
  test.beforeEach(async ({ page }) => {
    await setupBaseMocks(page);
  });

  test("blog index loads with posts", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByText("BatchlyAI Blog")).toBeVisible({ timeout: 10000 });
    const links = page.getByRole("link").filter({ has: page.locator("h2") });
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("blog post detail loads", async ({ page }) => {
    await page.goto("/blog/intro-to-batchlyai");
    await expect(page.getByText("BatchlyAI")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("blog post not found shows error state", async ({ page }) => {
    await page.goto("/blog/nonexistent-post-slug");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Share gallery", () => {
  test.beforeEach(async ({ page }) => {
    await setupBaseMocks(page);
  });

  test("share gallery page handles missing batch gracefully", async ({ page }) => {
    await page.goto("/g/nonexistent-share-id");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Referral landing", () => {
  test("referral landing redirects to signup", async ({ page }) => {
    await page.goto("/r/testcode");
    const url = page.url();
    // Server-side redirect to signup (with or without ref param)
    expect(url).toContain("/signup");
  });

  test("referral landing without code handles gracefully", async ({ page }) => {
    await page.goto("/r/");
    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
  });
});
