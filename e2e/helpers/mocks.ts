import type { Page } from "@playwright/test";

/** Mock auth endpoints: sign-up, sign-in, get-session, send-verification */
export async function mockAuth(page: Page, opts?: { authenticated?: boolean }) {
  const userId = opts?.authenticated ? "e2e-user" : null;

  await page.route("**/api/auth/sign-up/email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: "e2e-token",
        user: { id: "u1", name: "New User", email: "new@test.com", credits: 10 },
      }),
    });
  });

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

  await page.route("**/api/auth/send-verification-email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        userId
          ? { user: { id: userId, name: "E2E User", email: "e2e@test.com", credits: 100 } }
          : { user: null },
      ),
    });
  });
}

/** Mock generation flow: generate → poll → complete */
export async function mockGenerate(page: Page) {
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        predictionIds: ["pred-1", "pred-2"],
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
            id: "pred-1",
            status: "succeeded",
            urls: ["https://picsum.photos/1024/1024?r=1"],
            error: null,
          },
          {
            id: "pred-2",
            status: "succeeded",
            urls: ["https://picsum.photos/1024/1024?r=2"],
            error: null,
          },
        ],
      }),
    });
  });
}

/** Mock upload flow */
export async function mockUpload(page: Page) {
  await page.route("**/api/upload-url", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        publicUrl: "/api/files/uploads/e2e/test.png",
        key: "uploads/e2e/test.png",
      }),
    });
  });
}

/** Mock referral endpoints */
export async function mockReferral(page: Page, opts?: { active?: boolean }) {
  if (opts?.active) {
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
  } else {
    await page.route("**/api/referral/stats", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tier: "none",
          totalReferrals: 0,
          totalCreditsEarned: 0,
          commissionTotal: 0,
          referralCode: null,
          shareUrl: null,
        }),
      });
    });
  }

  await page.route("**/api/referral/generate-code", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: "NEWCODE", shareUrl: "https://batchlyai.com/r/NEWCODE" }),
    });
  });
}

/** Mock Stripe checkout */
export async function mockStripe(page: Page) {
  await page.route("**/api/stripe/checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://checkout.stripe.com/c/test" }),
    });
  });
}

/** Mock templates API */
export async function mockTemplates(page: Page) {
  await page.route("**/api/templates**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        templates: [
          {
            slug: "t1",
            name: "Test Template",
            description: "A test",
            category: "general",
            previewImageUrl: null,
            usageCount: 5,
          },
        ],
      }),
    });
  });
}

/** Mock prompts API */
export async function mockPrompts(page: Page) {
  await page.route("**/api/prompts**", async (route) => {
    const method = route.request().method();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        method === "GET"
          ? {
              prompts: [
                {
                  id: "p1",
                  name: "Saved Prompt",
                  promptTemplate: "A {{cat}}",
                  model: "z-image-pro",
                  tags: "[]",
                  usageCount: 3,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
              ],
            }
          : { success: true },
      ),
    });
  });
}

/** Mock generations history API */
export async function mockGenerations(page: Page) {
  await page.route("**/api/generations**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        generations: [
          {
            id: "g1",
            promptTemplate: "A {{cat}} in {{forest}}",
            resolvedPrompts: ["A cat in forest"],
            variableGroups: [{ values: ["cat"] }, { values: ["forest"] }],
            resultUrls: ["https://picsum.photos/200"],
            model: "z-image-pro",
            creditsUsed: 20,
            createdAt: Math.floor(Date.now() / 1000) - 3600,
          },
        ],
        total: 1,
      }),
    });
  });
}

/** Setup all common mocks for a fully authenticated user session */
export async function setupAllMocks(page: Page) {
  await mockAuth(page, { authenticated: true });
  await mockGenerate(page);
  await mockUpload(page);
  await mockStripe(page);
  await mockReferral(page, { active: true });
  await mockTemplates(page);
  await mockPrompts(page);
  await mockGenerations(page);
}
