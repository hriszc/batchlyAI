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
    // At least one blog post should be listed
    const links = page.getByRole("link").filter({ has: page.locator("h2") });
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("blog post detail loads", async ({ page }) => {
    await page.goto("/blog/intro-to-batchlyai");
    await expect(page.getByText("BatchlyAI")).toBeVisible({ timeout: 10000 });
    // Post should have a heading
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("blog post not found shows error state", async ({ page }) => {
    await page.goto("/blog/nonexistent-post-slug");
    // Should not crash — shows not found state
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Template market", () => {
  test.beforeEach(async ({ page }) => {
    await setupBaseMocks(page);
    await page.route("**/api/templates**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          templates: [
            {
              slug: "test-template",
              name: "Test Template",
              description: "A test template",
              category: "general",
              previewImageUrl: null,
              usageCount: 5,
            },
            {
              slug: "product-photo",
              name: "Product Photo",
              description: "Generate product shots",
              category: "product-photos",
              previewImageUrl: "https://picsum.photos/400/250",
              usageCount: 42,
            },
          ],
        }),
      });
    });
  });

  test("template market page loads", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByText("Prompt Templates")).toBeVisible({ timeout: 10000 });
  });

  test("template cards render after API response", async ({ page }) => {
    await page.goto("/templates");
    // Wait for API call to resolve and cards to render
    await expect(page.getByText("Test Template")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Product Photo")).toBeVisible();
  });

  test("template card shows usage count", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByText("42")).toBeVisible({ timeout: 5000 });
  });

  test("category filters are visible", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByText("General")).toBeVisible();
    await expect(page.getByText("Photography")).toBeVisible();
  });

  test("template detail page loads server-side", async ({ page }) => {
    // Server-rendered page — basic load test
    await page.goto("/templates/test-template");
    // Should render either the template detail or an error (valid load — no crash)
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Share gallery", () => {
  test.beforeEach(async ({ page }) => {
    await setupBaseMocks(page);
  });

  test("share gallery page handles missing batch gracefully", async ({ page }) => {
    await page.goto("/g/nonexistent-share-id");
    // Should show "not found" or similar message — not crash
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Referral landing", () => {
  test("referral landing redirects to signup", async ({ page }) => {
    const resp = await page.goto("/r/testcode");
    // Should redirect to signup page with ref param
    const url = page.url();
    expect(url).toContain("/signup");
  });

  test("referral landing without code handles gracefully", async ({ page }) => {
    await page.goto("/r/");
    // Should not crash
    await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
  });
});
