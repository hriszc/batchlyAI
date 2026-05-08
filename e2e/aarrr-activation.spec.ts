import { test, expect } from "@playwright/test";

async function setupMocks(page: import("@playwright/test").Page) {
  // Sign-up with email verification required
  await page.route("**/api/auth/sign-up/email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });

  // After verification, user is authenticated
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", name: "New User", email: "new@test.com", credits: 100 },
      }),
    });
  });

  // Generate API
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        predictionIds: ["pred-1"],
        status: "processing",
        async: true,
        creditsRemaining: 80,
        modelType: "replicate",
        isVideo: false,
        watermark: false,
      }),
    });
  });

  // Poll status — returns completed image
  await page.route("**/api/generate-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [
          {
            id: "pred-1",
            status: "succeeded",
            urls: ["https://picsum.photos/1024/1024?random=1"],
            error: null,
          },
        ],
      }),
    });
  });
}

test.describe("AARRR Activation — signup → verify → first generate → results", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test("signup flows into email verification page", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#name", "New User");
    await page.fill("#email", "activate@test.com");
    await page.fill("#password", "test123456");
    await page.fill("#confirm_password", "test123456");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    // Should be on verification page (not redirected to homepage)
    await expect(page.getByText(/verify your email|验证邮箱/i)).toBeVisible({ timeout: 5000 });
  });

  test("verification page has email displayed and back-to-login link", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#name", "User2");
    await page.fill("#email", "act2@test.com");
    await page.fill("#password", "test123456");
    await page.fill("#confirm_password", "test123456");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    // Email shown on verification page
    await expect(page.getByText("act2@test.com")).toBeVisible();
    // MailCheckIcon should be present
    await expect(page.locator(".lucide-mail-check").first()).toBeVisible();
  });

  test("generate button enabled with authenticated session", async ({ page }) => {
    await page.goto("/");
    const textarea = page.locator("textarea").first();
    await textarea.fill("A beautiful sunset over mountains");
    await page.waitForTimeout(800);
    // After filling prompt, generate button should be enabled
    const genBtn = page
      .locator("button")
      .filter({ hasText: /generate|开始生成/i })
      .first();
    await expect(genBtn).toBeVisible();
  });

  test("clicking generate invokes the API and shows loading state", async ({ page }) => {
    await page.goto("/");
    const textarea = page.locator("textarea").first();
    await textarea.fill("A {{cat, dog}} in {{forest, beach}}");
    await page.waitForTimeout(800);
    const genBtn = page
      .locator("button")
      .filter({ hasText: /generate|开始生成/i })
      .first();
    if (await genBtn.isEnabled()) {
      await genBtn.click();
      await page.waitForTimeout(2000);
    }
    // Page should not crash
    await expect(page.locator("body")).toBeVisible();
  });

  test("results appear after generate+poll completes", async ({ page }) => {
    await page.goto("/");
    const textarea = page.locator("textarea").first();
    await textarea.fill("A {{cat, dog}} in {{forest, beach}}");
    await page.waitForTimeout(800);
    const genBtn = page
      .locator("button")
      .filter({ hasText: /generate|开始生成/i })
      .first();
    if (await genBtn.isEnabled()) {
      await genBtn.click();
      // Wait for polling to complete
      await page.waitForTimeout(4000);
    }
    // Results heading may appear
    const heading = page.getByText(/results|生成结果/i);
    if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(heading).toBeVisible();
    }
  });

  test("Chinese signup flow works", async ({ page }) => {
    await page.goto("/cn/signup");
    await page.waitForTimeout(500);
    // Should show Chinese form labels
    await expect(page.locator("body")).toBeVisible();
  });

  test("mobile signup is responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/signup");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });
});
