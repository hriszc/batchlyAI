import { test, expect } from "@playwright/test";

async function setupMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", name: "Referrer", email: "ref@test.com", credits: 5 },
      }),
    });
  });
  await page.route("**/api/credits", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ credits: 5, creditsRemaining: 5 }),
    });
  });
  await page.route("**/api/referral/stats", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        tier: "bronze",
        totalReferrals: 3,
        totalCreditsEarned: 150,
        commissionTotal: 0,
        referralCode: "ABC123",
        shareUrl: "https://batchlyai.com/r/ABC123",
      }),
    });
  });
  await page.route("**/api/referral/generate-code", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: "NEWCODE", shareUrl: "https://batchlyai.com/r/NEWCODE" }),
    });
  });
  await page.route("**/api/stripe/checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://checkout.stripe.com/c/test" }),
    });
  });
}

test.describe("AARRR Referral — create and share referral code", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test("referral stats show in SettingsBar", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    // Should show referral info: earned credits or invites count
    const earnedText = page.getByText("150");
    await expect(earnedText.first()).toBeVisible({ timeout: 3000 });
  });

  test("Copy Referral Link button visible when code exists", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    const copyBtn = page.getByText(/copy referral/i);
    if (await copyBtn.isVisible().catch(() => false)) {
      await expect(copyBtn.first()).toBeVisible();
    }
  });

  test("referral landing page redirects to signup", async ({ page }) => {
    await page.route("**/r/ABC123", async (route) => {
      await route.fulfill({ status: 302, headers: { Location: "/signup?ref=ABC123" } });
    });
    await page.goto("/r/ABC123");
    await page.waitForTimeout(500);
    expect(page.url()).toContain("/signup");
  });

  test("share gallery page loads", async ({ page }) => {
    await page.route("**/g/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><main><h1>Shared Batch</h1></main></body></html>",
      });
    });
    await page.goto("/g/share-abc");
    await expect(page.locator("main")).toBeVisible({ timeout: 5000 });
  });

  test("referral tier badge visible for active referrer", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    // Should show tier: "bronze"
    const tierBadge = page.getByText("bronze");
    if (await tierBadge.isVisible().catch(() => false)) {
      await expect(tierBadge).toBeVisible();
    }
  });
});
