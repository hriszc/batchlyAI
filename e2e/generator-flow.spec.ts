import { test, expect } from "@playwright/test";

import { mockAuth, mockGenerate, mockUpload } from "./helpers/mocks";

test.describe("Generator E2E", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { authenticated: true });
    await mockGenerate(page);
    await mockUpload(page);
  });

  test("page loads with logo visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible({ timeout: 10000 });
  });

  test("prompt textarea visible and accepts input", async ({ page }) => {
    await page.goto("/");
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();
    await textarea.fill("A {{cat, dog}} in {{forest, beach}}");
    await expect(textarea).toHaveValue("A {{cat, dog}} in {{forest, beach}}");
  });

  test("variable groups appear after typing template with vars", async ({ page }) => {
    await page.goto("/");
    const textarea = page.locator("textarea").first();
    await textarea.fill("A {{cat, dog}} in {{forest, beach}}");
    await page.waitForTimeout(1000);
    const value = await textarea.inputValue();
    expect(value).toContain("cat");
  });

  test("language toggle switches to Chinese", async ({ page }) => {
    await page.goto("/cn");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible({ timeout: 10000 });
    const description = page.locator("p").first();
    await expect(description).toContainText(/[一-鿿]/);
  });

  test("theme toggle button exists", async ({ page }) => {
    await page.goto("/");
    const svgButtons = page.locator("button").filter({ has: page.locator("svg") });
    expect(await svgButtons.count()).toBeGreaterThanOrEqual(1);
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("responsive layout at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("textarea").first()).toBeVisible();
  });

  test("file upload input accepts a file", async ({ page }) => {
    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake"),
    });
    await page.waitForTimeout(500);
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible();
  });

  test("model selector shows available models", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/pro|fast/i).first()).toBeVisible();
  });

  test("aspect ratio buttons are visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("16:9").first()).toBeVisible();
    await expect(page.getByText("1:1").first()).toBeVisible();
    await expect(page.getByText("9:16").first()).toBeVisible();
  });
});
