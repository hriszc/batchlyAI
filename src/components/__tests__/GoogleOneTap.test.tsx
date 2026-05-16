import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "#test/test-utils";

const mockEnv = vi.hoisted(() => ({
  VITE_GOOGLE_CLIENT_ID: "",
}));
const mockInvalidate = vi.hoisted(() => vi.fn());

vi.mock("@/env/client", () => ({
  env: mockEnv,
}));

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: null }),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: mockInvalidate }),
}));

import { GoogleOneTap } from "../GoogleOneTap";

describe("GoogleOneTap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.VITE_GOOGLE_CLIENT_ID = "";
    document.head.innerHTML = "";
    delete window.google;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads One Tap with the runtime client id when Vite env is missing", async () => {
    const initialize = vi.fn();
    const prompt = vi.fn();
    window.google = {
      accounts: {
        id: {
          initialize,
          prompt,
          cancel: vi.fn(),
          disableAutoSelect: vi.fn(),
        },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ clientId: "runtime-google-client-id" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderWithProviders(<GoogleOneTap />);

    const script = await waitFor(() => {
      const el = document.getElementById("google-gsi-script") as HTMLScriptElement | null;
      expect(el).not.toBeNull();
      return el!;
    });
    script.onload?.(new Event("load"));

    expect(fetch).toHaveBeenCalledWith("/api/auth/google-one-tap-config", {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: "runtime-google-client-id" }),
    );
    expect(prompt).toHaveBeenCalled();
  });
});
