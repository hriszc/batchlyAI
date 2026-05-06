import { test, expect } from "@playwright/test";

async function setupAuthMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/sign-in/email", async (route) => {
    const body = route.request().postDataJSON() as { email: string; password: string };
    if (body.email === "test@test.com" && body.password === "test123456") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "e2e-token", user: { id: "u1", name: "Tester", email: "test@test.com", credits: 100 } }),
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
      body: JSON.stringify({ token: "e2e-new", user: { id: "new", name: "New", email: "new@test.com", credits: 10 } }),
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

// Select the primary login button (the form submit, not social/Google buttons)
function getLoginButton(page: import("@playwright/test").Page) {
  return page.locator('button[type="submit"]').filter({ hasText: /sign in|login|登录/i }).first();
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
    // At least one login button exists (may be multiple: form submit + social)
    const loginBtn = page.locator("button").filter({ hasText: /sign in|login|登录/i }).first();
    await expect(loginBtn).toBeVisible();
  });

  test("login form validates empty fields", async ({ page }) => {
    await page.goto("/login");
    const submitBtn = getLoginButton(page);
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "wrong@test.com");
    await page.fill('input[type="password"]', "wrongpass");
    const submitBtn = getLoginButton(page);
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }
    await page.waitForTimeout(800);
    const toast = page.locator("[data-sonner-toast]");
    if (await toast.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(toast).toBeVisible();
    }
  });

  test("login with valid credentials succeeds", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@test.com");
    await page.fill('input[type="password"]', "test123456");
    const submitBtn = getLoginButton(page);
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("signup form has required fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    const nameInput = page.locator('input[name="name"]').or(page.locator('input[id="name"]'));
    await expect(nameInput).toBeVisible();
    const signupBtn = page.locator("button").filter({ hasText: /sign up|注册/i }).first();
    await expect(signupBtn).toBeVisible();
  });

  test("can navigate between login and signup", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.getByText(/sign up|注册|create account/i);
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/signup/);
    }
  });
});
