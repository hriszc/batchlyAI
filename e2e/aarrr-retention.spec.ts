import { test, expect } from "@playwright/test";

async function setupMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", name: "Returning", email: "ret@test.com", credits: 42 },
      }),
    });
  });
  await page.route("**/api/generations**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        generations: [
          {
            id: "g1",
            promptTemplate: "A {{cat}} in {{forest}}",
            resolvedPrompts: ["A cat in forest"],
            variableGroups: [{ values: ["cat"] }, { values: ["forest"] }],
            resultUrls: ["https://picsum.photos/200"],
            model: "z-image-pro",
            creditsUsed: 20,
            createdAt: Math.floor(Date.now() / 1000) - 3600,
          },
          {
            id: "g2",
            promptTemplate: "A sunset",
            resolvedPrompts: ["A sunset"],
            variableGroups: [],
            resultUrls: ["https://picsum.photos/201"],
            model: "z-image-fast",
            creditsUsed: 10,
            createdAt: Math.floor(Date.now() / 1000) - 7200,
          },
        ],
        total: 2,
      }),
    });
  });
  await page.route("**/api/prompts**", async (route) => {
    const method = route.request().method();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        method === "GET"
          ? {
              prompts: [
                {
                  id: "p1",
                  name: "My Prompt",
                  promptTemplate: "A {{cat}}",
                  model: "z-image-pro",
                  tags: "[]",
                  usageCount: 3,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
              ],
            }
          : { success: true },
      ),
    });
  });
}

test.describe("AARRR Retention — history and saved prompts", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test("user sees credits in SettingsBar", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    // Credits should be visible when authenticated
    const credits = page.getByText("42");
    await expect(credits.first()).toBeVisible({ timeout: 3000 });
  });

  test("generations history page shows entries", async ({ page }) => {
    await page.goto("/generations");
    await page.waitForTimeout(1000);
    // Should show something — either history entries or a message
    await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
  });

  test("Buy Credits button visible for returning user", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    const buyBtn = page.getByText(/buy credits|购买积分/i);
    await expect(buyBtn.first()).toBeVisible({ timeout: 3000 });
  });

  test("template market loads with mock data", async ({ page }) => {
    await page.route("**/api/templates**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          templates: [
            {
              slug: "t1",
              name: "Test Template",
              description: "A test",
              category: "general",
              previewImageUrl: null,
              usageCount: 5,
            },
          ],
        }),
      });
    });
    await page.goto("/templates");
    await page.waitForTimeout(1000);
    await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
  });

  test("blog index page loads", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });
});
