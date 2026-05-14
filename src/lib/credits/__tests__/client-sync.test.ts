import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { authClient } from "@/lib/auth/auth-client";
import { authQueryOptions } from "@/lib/auth/queries";

import { applyCreditsToClientCaches, fetchCreditsFromServer } from "../client-sync";

describe("credit client sync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const sessionAtom = authClient.$store.atoms.session;
    sessionAtom.set({
      ...sessionAtom.get(),
      data: null,
      isPending: false,
    });
  });

  it("updates the auth session atom and auth query cache", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(authQueryOptions().queryKey, {
      id: "u1",
      email: "u1@test.com",
      credits: 10,
    });

    const sessionAtom = authClient.$store.atoms.session;
    sessionAtom.set({
      ...sessionAtom.get(),
      data: { user: { id: "u1", credits: 10 } },
      isPending: false,
    });

    applyCreditsToClientCaches(77, queryClient);

    expect((sessionAtom.get().data as { user: { credits: number } }).user.credits).toBe(77);
    expect(queryClient.getQueryData(authQueryOptions().queryKey)).toEqual({
      id: "u1",
      email: "u1@test.com",
      credits: 77,
    });
  });

  it("fetches credits from the backend endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ credits: 88 }),
      }),
    );

    await expect(fetchCreditsFromServer()).resolves.toBe(88);
    expect(fetch).toHaveBeenCalledWith(
      "/api/credits",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });
});
