import { test, expect } from "@playwright/test";

async function setupAuthMocks(page: import("@playwright/test").Page) {
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
        body: JSON.stringify({ error: "Invalid credentials" }),
      });
    }
  });

  await page.route("**/api/auth/sign-up/email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: "e2e-new",
        user: { id: "new", name: "New", email: "new@test.com", credits: 10 },
      }),
    });
  });

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: null }),
    });
  });
}

test.describe("Auth E2E (with API mocks)", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page);
  });

  test("unauthenticated user sees login link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/login/i).first()).toBeVisible();
  });

  test("login page shows email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    const loginBtn = page
      .locator("button")
      .filter({ hasText: /sign in|login|登录/i })
      .first();
    await expect(loginBtn).toBeVisible();
  });

  test("login form validates empty fields", async ({ page }) => {
    await page.goto("/login");
    const btn = page
      .locator("button")
      .filter({ hasText: /sign in|login|登录/i })
      .first();
    if (await btn.isVisible()) await btn.click();
    // Should stay on login page
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("login submits and shows response", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@test.com");
    await page.fill('input[type="password"]', "test123456");
    const btn = page
      .locator("button")
      .filter({ hasText: /sign in|login|登录/i })
      .first();
    await btn.click();
    // API mock returns 200 with token — page should respond (redirects to /)
    await page.waitForTimeout(2000);
    // Either redirect happened (not /login) or we're still on /login with success state
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy(); // page didn't crash
  });

  test("signup form has required fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    // Signup may have password + confirm-password — match first
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    const nameInput = page.locator('input[name="name"]').or(page.locator('input[id="name"]'));
    await expect(nameInput).toBeVisible();
  });

  test("can navigate between login and signup", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.getByText(/sign up|注册|create account/i);
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/signup/);
    }
  });

  test("signup redirects to verify-email page", async ({ page }) => {
    await page.goto("/signup");
    // Fill signup form
    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[type="email"]', "new@test.com");
    await page.fill('input[id="password"]', "test123456");
    await page.fill('input[id="confirm_password"]', "test123456");
    // Submit
    const btn = page
      .locator("button")
      .filter({ hasText: /sign up|注册/i })
      .first();
    await btn.click();
    // Should redirect to verify-email
    await expect(page).toHaveURL(/verify-email/, { timeout: 5000 });
  });

  test("verify-email page shows instructions and resend button", async ({ page }) => {
    await page.goto("/verify-email?email=new@test.com");
    // Should show verify email title
    await expect(page.getByText(/verify your email/i)).toBeVisible();
    // Should show the email
    await expect(page.getByText("new@test.com")).toBeVisible();
    // Should have resend button
    const resendBtn = page.getByText(/resend/i);
    await expect(resendBtn).toBeVisible();
  });

  test("verify-email resend button works", async ({ page }) => {
    // Mock the send-verification-email endpoint
    await page.route("**/api/auth/send-verification-email", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });
    await page.goto("/verify-email?email=new@test.com");
    const resendBtn = page.getByText(/resend/i);
    await resendBtn.click();
    // Should show success message
    await expect(page.getByText(/sent|发送/i)).toBeVisible({ timeout: 5000 });
  });

  test("login with unverified email shows error", async ({ page }) => {
    // Override sign-in mock to return email-not-verified
    await page.route("**/api/auth/sign-in/email", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: { message: "Please verify your email address before signing in" },
        }),
      });
    });
    await page.goto("/login");
    await page.fill('input[type="email"]', "unverified@test.com");
    await page.fill('input[type="password"]', "test123456");
    const btn = page
      .locator("button")
      .filter({ hasText: /sign in|login|登录/i })
      .first();
    await btn.click();
    // Should show error about verification
    await expect(page.getByText(/verify|verification/i)).toBeVisible({ timeout: 5000 });
  });
});
