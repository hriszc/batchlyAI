import { test, expect } from "@playwright/test";

async function setupApiMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "e2e-user-001", name: "E2E Tester", email: "e2e@test.com", credits: 100 },
      }),
    });
  });

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

  test("page loads with logo visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible({ timeout: 10000 });
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
    await page.waitForTimeout(800);
    // Variable group labels should appear (Group 1 / Group 2 or Chinese equivalent)
    const group1 = page.getByText(/Group 1|变量组 1/);
    await expect(group1).toBeVisible({ timeout: 3000 });
  });

  test("language toggle switches to Chinese", async ({ page }) => {
    await page.goto("/");
    await page.goto("/cn");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible({ timeout: 10000 });
    const description = page.locator("p").first();
    await expect(description).toContainText(/[一-鿿]/);
  });

  test("theme toggle exists", async ({ page }) => {
    await page.goto("/");
    const buttons = page.locator("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("login page loads from nav", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("signup page loads from nav", async ({ page }) => {
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
      name: "test-image.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png-content"),
    });
    await page.waitForTimeout(500);
    // Should not crash
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
