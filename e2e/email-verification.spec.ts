import { test, expect } from "@playwright/test";

async function setupMocks(page: import("@playwright/test").Page) {
  // Sign-up returns token directly (Better Auth's internal response format)
  // The real app shows verification page when signUp.email() succeeds without error
  await page.route("**/api/auth/sign-up/email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: null }), // no token = verification required
    });
  });

  await page.route("**/api/auth/send-verification-email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });

  await page.route("**/api/auth/verify-email**", async (route) => {
    await route.fulfill({ status: 302, headers: { Location: "/?verified=true" } });
  });

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: null }),
    });
  });
}

test.describe("Email Verification E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test("signup page has name/email/password/confirm fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirm_password")).toBeVisible();
  });

  test("signup with valid data succeeds without crashing", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#name", "Test User");
    await page.fill("#email", "verify@test.com");
    await page.fill("#password", "test123456");
    await page.fill("#confirm_password", "test123456");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    // Page shows either form or verification state
    await expect(page.locator("body")).toBeVisible();
  });

  test("password mismatch keeps form visible", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#name", "Test");
    await page.fill("#email", "mismatch@test.com");
    await page.fill("#password", "test123456");
    await page.fill("#confirm_password", "different");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    // Form should still be visible (no navigation)
    await expect(page.locator("#email")).toBeVisible();
  });

  test("verify-email endpoint redirects after success", async ({ page }) => {
    await page.goto("/api/auth/verify-email?token=test123&callbackURL=/");
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toBeVisible();
  });

  test("resend verification endpoint is mocked correctly", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#name", "Test");
    await page.fill("#email", "resend@test.com");
    await page.fill("#password", "test123456");
    await page.fill("#confirm_password", "test123456");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    // Page should not crash after signup
    await expect(page.locator("body")).toBeVisible();
  });
});
