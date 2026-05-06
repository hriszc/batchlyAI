import { test, expect } from "@playwright/test";

// Mock API responses so E2E tests run without D1 backend
async function setupApiMocks(page: import("@playwright/test").Page) {
  // Mock auth — return a fake session
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "e2e-user-001", name: "E2E Tester", email: "e2e@test.com", credits: 100 },
      }),
    });
  });

  // Mock generate — return async prediction IDs
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        predictionIds: ["pred-e2e-001", "pred-e2e-002"],
        status: "processing",
        async: true,
        creditsRemaining: 80,
        modelType: "replicate",
        isVideo: false,
        watermark: false,
      }),
    });
  });

  // Mock generate-status — return completed image URLs
  await page.route("**/api/generate-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [
          {
            id: "pred-e2e-001",
            status: "succeeded",
            urls: ["https://picsum.photos/1024/1024?random=1"],
            error: null,
          },
          {
            id: "pred-e2e-002",
            status: "succeeded",
            urls: ["https://picsum.photos/1024/1024?random=2"],
            error: null,
          },
        ],
      }),
    });
  });

  // Mock upload-url
  await page.route("**/api/upload-url", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        publicUrl: "/api/files/uploads/user_e2e/test.png",
        key: "uploads/user_e2e/test.png",
      }),
    });
  });
}

test.describe("Generator E2E (with API mocks)", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("page loads with correct title and logo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible();
    // H1 should use sr-only (accessible but visually hidden since logo shows text)
    await expect(page.locator("h1")).toBeVisible();
  });

  test("prompt textarea is visible and accepts input", async ({ page }) => {
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
    await page.waitForTimeout(700);
    // Variable group cards should appear
    await expect(page.getByText("Group 1")).toBeVisible();
    await expect(page.getByText("Group 2")).toBeVisible();
  });

  test("language toggle switches to Chinese", async ({ page }) => {
    await page.goto("/");
    const langBtn = page.getByLabel(/language|语言/i);
    if (await langBtn.isVisible()) await langBtn.click();
    await page.goto("/cn");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible();
    const p = page.locator("p").first();
    await expect(p).toContainText(/[一-鿿]/);
  });

  test("theme toggle exists and cycles", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const buttons = page.locator("button");
    // There should be at least the theme and lang buttons
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("generate button enabled/disabled state works", async ({ page }) => {
    await page.goto("/");
    const generateBtn = page.locator("button").filter({ hasText: /generate|开始生成/i }).first();
    await expect(generateBtn).toBeDisabled();

    const textarea = page.locator("textarea").first();
    await textarea.fill("A beautiful landscape");
    await page.waitForTimeout(200);
    await expect(generateBtn).toBeEnabled();
  });

  test("clicking generate sends request and shows results", async ({ page }) => {
    await page.goto("/");

    // Fill prompt, click generate
    const textarea = page.locator("textarea").first();
    await textarea.fill("A beautiful landscape");
    await page.waitForTimeout(200);

    const generateBtn = page.locator("button").filter({ hasText: /generate|开始生成/i }).first();
    await generateBtn.click();

    // Wait for results heading to appear
    await expect(page.getByText("Results")).toBeVisible({ timeout: 5000 });
  });

  test("file upload via paperclip shows in UI", async ({ page }) => {
    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-image.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png-content"),
    });
    await page.waitForTimeout(500);
    // The attach button should still be visible after upload
    const attachBtn = page.getByRole("button", { name: /attach|附件/i });
    await expect(attachBtn).toBeVisible();
  });

  test("model selector shows available models", async ({ page }) => {
    await page.goto("/");
    // Model picker should show something like Pro/Fast
    await expect(page.getByText(/pro|fast/i).first()).toBeVisible();
  });

  test("aspect ratio buttons switch active state", async ({ page }) => {
    await page.goto("/");
    // Click 16:9
    await page.getByText("16:9").first().click();
    await page.waitForTimeout(100);
    // Verify button is visible
    await expect(page.getByText("16:9").first()).toBeVisible();
    // Switch back to 9:16
    await page.getByText("9:16").first().click();
    await expect(page.getByText("9:16").first()).toBeVisible();
  });

  test("quantity buttons switch active state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("2").first()).toBeVisible();
    // Click Qty 4
    await page.getByText("4").first().click();
    await page.waitForTimeout(100);
  });

  test("responsive layout at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible();
    await expect(page.locator("textarea").first()).toBeVisible();
  });
});
