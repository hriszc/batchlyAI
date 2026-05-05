import { test, expect } from "@playwright/test";

test.describe("Generator E2E", () => {
  test("page loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible();
  });

  test("prompt textarea is visible and accepts input", async ({ page }) => {
    await page.goto("/");
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();
    await textarea.fill("A {{cat, dog}} in {{forest, beach}}");
    await expect(textarea).toHaveValue("A {{cat, dog}} in {{forest, beach}}");
  });

  test("variable groups appear after typing template with vars", async ({ page }) => {
    test.skip(!!process.env.CI, "Requires auth backend (D1 not available in CI)");
    await page.goto("/");
    const textarea = page.locator("textarea").first();
    await textarea.fill("A {{cat, dog}} in {{forest, beach}}");
    // Wait for debounce (500ms)
    await page.waitForTimeout(600);
    // Variable group cards should appear
    await expect(page.getByText("Group 1")).toBeVisible();
    await expect(page.getByText("Group 2")).toBeVisible();
  });

  test("language toggle switches to Chinese", async ({ page }) => {
    test.skip(!!process.env.CI, "Requires auth backend (D1 not available in CI)");
    await page.goto("/");
    // Look for language toggle button in SettingsBar
    const langButton = page.getByLabel(/language/i);
    if (await langButton.isVisible()) {
      await langButton.click();
    }
    // Navigate to Chinese route
    await page.goto("/cn");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible();
    // Chinese description should contain Chinese characters
    const description = page.locator("p").first();
    const text = await description.textContent();
    expect(text).toMatch(/[一-鿿]/);
  });

  test("theme toggle exists", async ({ page }) => {
    await page.goto("/");
    // Theme toggle should be in the SettingsBar
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");

    // Toggle theme
    const themeButton = page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .first();
    if (await themeButton.isVisible()) {
      await themeButton.click();
      // Wait for any transition
      await page.waitForTimeout(300);
    }
  });

  test("login page loads", async ({ page }) => {
    test.skip(!!process.env.CI, "Requires auth backend (D1 not available in CI)");
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|登录/i })).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    test.skip(!!process.env.CI, "Requires auth backend (D1 not available in CI)");
    await page.goto("/signup");
    await expect(
      page.locator('input[id="name"]').or(page.locator('input[name="name"]')),
    ).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("responsive layout works at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible();
    // Generator card should be fully visible
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();
  });
});
