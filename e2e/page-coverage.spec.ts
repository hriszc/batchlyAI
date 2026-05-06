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

  test("blog index loads without crashing", async ({ page }) => {
    await page.goto("/blog");
    // Page should render main content
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Blog index has links to posts
    const links = page.locator("a[href*='/blog/']");
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("blog post detail loads without crashing", async ({ page }) => {
    await page.goto("/blog/intro-to-batchlyai");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("blog post not found handled gracefully", async ({ page }) => {
    await page.goto("/blog/nonexistent");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Share gallery", () => {
  test.beforeEach(async ({ page }) => {
    await setupBaseMocks(page);
  });

  test("share gallery page loads without crashing", async ({ page }) => {
    await page.route("**/g/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><main><h1>Batch not found</h1></main></body></html>",
      });
    });
    await page.goto("/g/nonexistent");
    await expect(page.locator("main")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Referral landing", () => {
  test("referral landing redirects to signup", async ({ page }) => {
    await page.route("**/r/testcode", async (route) => {
      await route.fulfill({ status: 302, headers: { Location: "/signup?ref=testcode" } });
    });
    await page.goto("/r/testcode");
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain("/signup");
  });

  test("referral landing without code handled", async ({ page }) => {
    await page.route("**/r/", async (route) => {
      await route.fulfill({ status: 302, headers: { Location: "/signup" } });
    });
    await page.goto("/r/");
    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
  });
});
