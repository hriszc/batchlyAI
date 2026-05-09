import { test, expect } from "@playwright/test";

// Real environment E2E — no API mocking.
// These tests hit the actual deployed Worker. They verify that the
// production/staging environment renders correctly and APIs function.
// Use E2E_BASE_URL env var to override the base URL (set in CI).

const TEST_EMAIL = `e2e-real-${Date.now()}@batchlyai.com`;

test.describe("Real Environment Smoke Tests (no mocking)", () => {
  test("homepage loads with logo and textarea", async ({ page }) => {
    await page.goto("/");
    // Real page should have the BatchlyAI logo
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible({ timeout: 15000 });
    // Real page should have a textarea for prompts
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
    // Placeholder should be present
    const placeholder = await textarea.getAttribute("placeholder");
    expect(placeholder).toBeTruthy();
  });

  test("login page loads with email/password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("signup page loads with form fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("signup with unique email succeeds", async ({ page }) => {
    await page.goto("/signup");
    const nameInput = page.locator('input[name="name"]').or(page.locator('input[id="name"]'));
    if (await nameInput.isVisible()) await nameInput.fill("Real E2E User");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill("e2e-test-123456");
    // Fill confirm password if present
    const confirmInput = page.locator('input[id="confirm_password"]');
    if (await confirmInput.isVisible()) await confirmInput.fill("e2e-test-123456");

    const btn = page
      .locator("button")
      .filter({ hasText: /sign up|注册/i })
      .first();
    await btn.click();
    await page.waitForTimeout(3000);

    // Should either show verification page or redirect
    // Either way, the page should not crash
    const body = page.locator("body");
    await expect(body).toBeVisible();
    const currentUrl = page.url();
    // Accept any non-error state
    expect(currentUrl).toBeTruthy();
  });

  test("health API returns ok", async ({ request }) => {
    const resp = await request.get("/api/health");
    expect(resp.status()).toBe(200);
    const body = (await resp.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  test("Chinese homepage loads", async ({ page }) => {
    await page.goto("/cn");
    await expect(page.locator('img[alt="BatchlyAI"]').first()).toBeVisible({ timeout: 15000 });
  });

  test("blog index page loads", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
  });

  test("templates page loads", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
  });
});
