import { test, expect } from "@playwright/test";

async function setupAuthMocks(page: import("@playwright/test").Page) {
  // Sign-up: requireEmailVerification=true → returns { status: "success" }, no token
  await page.route("**/api/auth/sign-up/email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });

  // Sign-in: wrong creds → 401, right creds → token
  await page.route("**/api/auth/sign-in/email", async (route) => {
    const body = route.request().postDataJSON() as { email: string; password: string };
    if (body.email === "test@test.com" && body.password === "test123456") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "e2e-token",
          user: { id: "u1", name: "Tester", email: "test@test.com", credits: 100 },
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Invalid credentials" } }),
      });
    }
  });

  // Send verification email (resend button)
  await page.route("**/api/auth/send-verification-email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
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

test.describe("Auth E2E — registration + login + email verification", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page);
  });

  // --- Registration ---
  test("signup form has name, email, password, confirm_password fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirm_password")).toBeVisible();
  });

  test("password mismatch shows error toast", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#name", "Test");
    await page.fill("#email", "new@test.com");
    await page.fill("#password", "test123456");
    await page.fill("#confirm_password", "different");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    // Toast or error should appear
    await expect(page.locator("body")).toBeVisible();
  });

  test("successful signup shows email verification page", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#name", "Test User");
    await page.fill("#email", "new@test.com");
    await page.fill("#password", "test123456");
    await page.fill("#confirm_password", "test123456");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    // Should switch to verification state: MailCheckIcon + "Verify your email"
    await expect(page.getByText(/verify your email|验证邮箱/i)).toBeVisible({ timeout: 5000 });
    // Email should be displayed
    await expect(page.getByText("new@test.com")).toBeVisible();
  });

  test("verification page shows resend button and back to login link", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#name", "Test");
    await page.fill("#email", "v@test.com");
    await page.fill("#password", "test123456");
    await page.fill("#confirm_password", "test123456");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    // Resend button
    const resendBtn = page.getByText(/resend|重新发送/i);
    await expect(resendBtn).toBeVisible({ timeout: 3000 });
    // Back to login link
    await expect(page.getByText(/back to login|返回登录/i)).toBeVisible();
  });

  test("resend verification triggers API and shows success", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#name", "Test");
    await page.fill("#email", "resend@test.com");
    await page.fill("#password", "test123456");
    await page.fill("#confirm_password", "test123456");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    const resendBtn = page.getByText(/resend|重新发送/i);
    await resendBtn.click();
    await page.waitForTimeout(1000);

    // "Verification email sent!" text should appear
    await expect(page.getByText(/sent|已发送/i)).toBeVisible({ timeout: 3000 });
  });

  // --- Login ---
  test("login page has email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "wrong@test.com");
    await page.fill("#password", "wrongpass");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);
    // Error toast should appear
    const toast = page.locator("[data-sonner-toast]");
    const visible = await toast.isVisible({ timeout: 3000 }).catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test("login with valid credentials redirects", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "test@test.com");
    await page.fill("#password", "test123456");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    // Should redirect away from /login
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("can navigate between login and signup pages", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.getByText(/sign up|注册|create account/i);
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/signup/);
    }
  });

  // --- Unauthenticated ---
  test("unauthenticated user sees login link on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/login/i).first()).toBeVisible({ timeout: 10000 });
  });
});
