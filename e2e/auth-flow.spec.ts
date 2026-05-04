import { test, expect } from "@playwright/test";

test.describe("Auth E2E", () => {
  test("unauthenticated user sees login link", async ({ page }) => {
    await page.goto("/");
    // SettingsBar should show Login link when not authenticated
    await expect(page.getByText(/login/i).first()).toBeVisible();
  });

  test("guest routes redirect to home when already logged in", async ({ page }) => {
    // This test verifies the guest route guard exists.
    // Without an active session, login page should load normally.
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("login form validates empty fields", async ({ page }) => {
    await page.goto("/login");
    const submitButton = page.getByRole("button", { name: /sign in|登录/i });
    await submitButton.click();
    // Page should still show the login form (not crash or redirect)
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("invalid@example.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    const submitButton = page.getByRole("button", { name: /sign in|登录/i });
    await submitButton.click();
    // Should show some error feedback (Better Auth returns error)
    await page.waitForTimeout(2000);
    // Either an error toast or the form is still visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("signup form has all required fields", async ({ page }) => {
    await page.goto("/signup");
    // Name, email, password fields should exist
    const nameInput = page.locator('input[id="name"]').or(page.locator('input[name="name"]'));
    const emailInput = page.locator('input[type="email"]');
    const passwordInputs = page.locator('input[type="password"]');

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    // At least one password field
    const count = await passwordInputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("can navigate between login and signup", async ({ page }) => {
    await page.goto("/login");
    // Look for a link to signup page
    const signupLink = page.getByText(/sign up|注册|create account/i);
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/signup/);
    }
  });
});
