import { test, expect } from "@playwright/test";

async function setupMocks(page: import("@playwright/test").Page) {
  // Sign-up returns verification-required status
  await page.route("**/api/auth/sign-up/email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });

  // Resend verification email
  await page.route("**/api/auth/send-verification-email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });

  // Verify-email endpoint
  await page.route("**/api/auth/verify-email**", async (route) => {
    await route.fulfill({ status: 302, headers: { Location: "/?verified=true" } });
  });

  // Unauthenticated
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: null }),
    });
  });
}

async function submitSignup(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signup");
  await page.fill("#name", "Test User");
  await page.fill("#email", email);
  await page.fill("#password", "test123456");
  await page.fill("#confirm_password", "test123456");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
}

test.describe("Email Verification Flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test("signup shows verification required page", async ({ page }) => {
    await submitSignup(page, "new@test.com");
    await expect(page.getByText(/verify your email|验证邮箱/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("new@test.com")).toBeVisible();
  });

  test("verification page shows resend button and back to login link", async ({ page }) => {
    await submitSignup(page, "v@test.com");
    await expect(page.getByText(/resend|重新发送/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/back to login|返回登录/i)).toBeVisible();
  });

  test("resend verification shows success text", async ({ page }) => {
    await submitSignup(page, "resend@test.com");
    const resendBtn = page.getByText(/resend|重新发送/i);
    await resendBtn.click();
    await page.waitForTimeout(1000);
    // "Verification email sent!" text appears
    await expect(page.getByText(/sent|已发送/i)).toBeVisible({ timeout: 5000 });
  });

  test("verification description text is visible", async ({ page }) => {
    await submitSignup(page, "desc@test.com");
    await expect(page.getByText(/inbox|收件箱|check your|查收/i)).toBeVisible({ timeout: 3000 });
  });

  test("verify-email API endpoint redirects", async ({ page }) => {
    await page.goto("/api/auth/verify-email?token=test123&callbackURL=/");
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/verify-email/);
  });
});
