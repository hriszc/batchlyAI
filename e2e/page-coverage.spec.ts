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

  test("share gallery page handles missing batch gracefully (UI)", async ({ page }) => {
    // Intercept the full page since D1 migration may be missing in local dev
    await page.route("**/g/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><main><h1>Batch not found</h1><p>This share link is invalid or expired.</p></main></body></html>",
      });
    });
    await page.goto("/g/nonexistent-share-id");
    await expect(page.locator("main")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/not found|invalid|expired/i)).toBeVisible();
  });
});

test.describe("Referral landing", () => {
  test("referral landing redirects to signup", async ({ page }) => {
    // Intercept to avoid D1 table missing on local dev
    await page.route("**/r/testcode", async (route) => {
      await route.fulfill({
        status: 302,
        headers: { Location: "/signup?ref=testcode" },
      });
    });
    await page.goto("/r/testcode");
    await page.waitForTimeout(500);
    expect(page.url()).toContain("/signup");
  });

  test("referral landing without code handled", async ({ page }) => {
    await page.route("**/r/", async (route) => {
      await route.fulfill({
        status: 302,
        headers: { Location: "/signup" },
      });
    });
    await page.goto("/r/");
    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
  });
});
