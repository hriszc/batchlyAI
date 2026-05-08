import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useAuthGate } from "../useAuthGate";

// Mock authClient
vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
  },
}));

import { authClient } from "@/lib/auth/auth-client";

describe("useAuthGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes action directly when user is authenticated", () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "u1", email: "test@test.com", credits: 100 } },
    });

    const { result } = renderHook(() => useAuthGate());
    const action = vi.fn();

    act(() => {
      result.current.checkAuth(action);
    });

    expect(action).toHaveBeenCalledOnce();
    expect(result.current.showLoginCard).toBe(false);
  });

  it("shows login card when user is not authenticated", () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
    });

    const { result } = renderHook(() => useAuthGate());
    const action = vi.fn();

    act(() => {
      result.current.checkAuth(action);
    });

    expect(action).not.toHaveBeenCalled();
    expect(result.current.showLoginCard).toBe(true);
  });

  it("closes login card without executing action", () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
    });

    const { result } = renderHook(() => useAuthGate());
    const action = vi.fn();

    act(() => {
      result.current.checkAuth(action);
      result.current.closeLogin();
    });

    expect(result.current.showLoginCard).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });
});
