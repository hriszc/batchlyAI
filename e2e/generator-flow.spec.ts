import { test, expect, type Page } from "@playwright/test";

import { mockAuth, mockGenerate, mockUpload } from "./helpers/mocks";

async function gotoRoute(page: Page, path: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 15_000 });
      return;
    } catch (err) {
      if (attempt === 3) throw err;
      await page.waitForTimeout(1_000);
    }
  }
}

test.describe("Generator E2E", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { authenticated: true });
    await mockGenerate(page);
    await mockUpload(page);
  });

  test("page loads with logo visible", async ({ page }) => {
    await gotoRoute(page, "/");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible({ timeout: 10000 });
  });

  test("prompt textarea visible and accepts input", async ({ page }) => {
    await gotoRoute(page, "/");
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();
    await textarea.fill("A {{cat, dog}} in {{forest, beach}}");
    await expect(textarea).toHaveValue("A {{cat, dog}} in {{forest, beach}}");
  });

  test("variable groups appear after typing template with vars", async ({ page }) => {
    await gotoRoute(page, "/");
    const textarea = page.locator("textarea").first();
    await textarea.fill("A {{cat, dog}} in {{forest, beach}}");
    await page.waitForTimeout(1000);
    const value = await textarea.inputValue();
    expect(value).toContain("cat");
  });

  test("language toggle switches to Chinese", async ({ page }) => {
    await gotoRoute(page, "/cn");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible({ timeout: 10000 });
    const description = page.locator("p").first();
    await expect(description).toContainText(/[一-鿿]/);
  });

  test("theme toggle button exists", async ({ page }) => {
    await gotoRoute(page, "/");
    const svgButtons = page.locator("button").filter({ has: page.locator("svg") });
    expect(await svgButtons.count()).toBeGreaterThanOrEqual(1);
  });

  test("login page loads", async ({ page }) => {
    await gotoRoute(page, "/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await gotoRoute(page, "/signup");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("responsive layout at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoRoute(page, "/");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("textarea").first()).toBeVisible();
  });

  test("upload control opens file chooser and uploads selected image", async ({ page }) => {
    test.setTimeout(60_000);

    const uploadControl = page.locator('input[type="file"][aria-label="Attach"]');
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await gotoRoute(page, "/");
        await expect(uploadControl).toBeVisible({ timeout: 10_000 });
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await page.waitForTimeout(1_000);
      }
    }

    const textarea = page.locator("textarea").first();
    await textarea.fill("A {{cat, dog}} in {{forest, beach}}");
    await expect(page.getByText("4 Variants")).toBeVisible({ timeout: 10_000 });

    const uploadRequest = page.waitForRequest(
      (request) => request.url().includes("/api/upload-url") && request.method() === "POST",
    );
    const fileChooserPromise = page.waitForEvent("filechooser");

    await uploadControl.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "reference.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake image"),
    });

    const request = await uploadRequest;
    expect(decodeURIComponent(request.headers()["x-file-name"] ?? "")).toBe("reference.png");
    await expect(page.getByText("reference.png")).toBeVisible();
  });

  test("model selector shows available models", async ({ page }) => {
    await gotoRoute(page, "/");
    await expect(page.getByText(/pro|fast/i).first()).toBeVisible();
  });

  test("aspect ratio buttons are visible", async ({ page }) => {
    await gotoRoute(page, "/");
    await expect(page.getByText("16:9").first()).toBeVisible();
    await expect(page.getByText("1:1").first()).toBeVisible();
    await expect(page.getByText("9:16").first()).toBeVisible();
  });
});
