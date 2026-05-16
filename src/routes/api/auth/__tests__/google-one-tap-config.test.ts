import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
  GOOGLE_CLIENT_ID: "server-google-client-id",
}));

vi.mock("@/env/server", () => ({
  env: mockEnv,
}));

import { handleGoogleOneTapConfig } from "@/routes/api/auth/google-one-tap-config";

describe("handleGoogleOneTapConfig", () => {
  beforeEach(() => {
    mockEnv.GOOGLE_CLIENT_ID = "server-google-client-id";
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("returns the server Google client id", async () => {
    const response = await handleGoogleOneTapConfig();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      clientId: "server-google-client-id",
    });
  });

  it("falls back to the Cloudflare runtime env binding", async () => {
    mockEnv.GOOGLE_CLIENT_ID = "";
    (globalThis as Record<string, unknown>).__env__ = {
      GOOGLE_CLIENT_ID: "runtime-google-client-id",
    };

    const response = await handleGoogleOneTapConfig();

    await expect(response.json()).resolves.toEqual({
      clientId: "runtime-google-client-id",
    });
  });
});
