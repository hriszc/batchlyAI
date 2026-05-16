import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { authClient } from "@/lib/auth/auth-client";

import { useGeneratorState } from "../useGeneratorState";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  const sessionAtom = authClient.$store.atoms.session;
  sessionAtom.set({
    ...sessionAtom.get(),
    data: null,
    isPending: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useGeneratorState", () => {
  it("returns initial state", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });
    expect(result.current.state.promptTemplate).toBe("");
    expect(result.current.state.isGenerating).toBe(false);
    expect(result.current.state.variableGroups).toEqual([]);
    expect(result.current.state.results).toEqual([]);
  });

  it("setPromptTemplate updates promptTemplate", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.actions.setPromptTemplate("hello world");
    });
    expect(result.current.state.promptTemplate).toBe("hello world");
  });

  it("setPromptTemplate clears error", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.actions.setError("some error");
    });
    expect(result.current.state.error).toBe("some error");

    act(() => {
      result.current.actions.setPromptTemplate("hello");
    });
    expect(result.current.state.error).toBeNull();
  });

  it("setQuantity updates quantity", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.actions.setQuantity(10);
    });
    expect(result.current.state.quantity).toBe(10);
  });

  it("setAspectRatio updates aspectRatio", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.actions.setAspectRatio("1:1");
    });
    expect(result.current.state.aspectRatio).toBe("1:1");
  });

  it("setModel updates model", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.actions.setModel("z-image-fast");
    });
    expect(result.current.state.model).toBe("z-image-fast");
  });

  it("syncs variable groups from template immediately", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.actions.setPromptTemplate("{{cat, dog}}");
    });
    expect(result.current.state.variableGroups).toEqual([{ id: "var_0", values: ["cat", "dog"] }]);
  });

  it("addValue adds empty string to synced variable group", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.actions.setPromptTemplate("{{cat, dog}}");
    });
    act(() => {
      result.current.actions.addValue("var_0");
    });
    const group = result.current.state.variableGroups[0];
    expect(group.values).toContain("");
  });

  it("updateValue modifies value at index", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.actions.setPromptTemplate("{{cat, dog}}");
    });
    act(() => {
      result.current.actions.updateValue("var_0", 0, "bird");
    });
    expect(result.current.state.variableGroups[0].values[0]).toBe("bird");
    expect(result.current.state.promptTemplate).toBe("{{bird, dog}}");
  });

  it("removeValue removes value at index", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.actions.setPromptTemplate("{{cat, dog, bird}}");
    });
    expect(result.current.state.variableGroups[0].values).toHaveLength(3);

    act(() => {
      result.current.actions.removeValue("var_0", 1);
    });
    expect(result.current.state.variableGroups[0].values).toHaveLength(2);
    expect(result.current.state.promptTemplate).toBe("{{cat, bird}}");
  });

  it("keeps promptTemplate in sync when variable values change", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.actions.setPromptTemplate("A {{cat, dog}} in {{forest, beach}}");
    });

    act(() => {
      result.current.actions.updateValue("var_0", 0, "lion");
      result.current.actions.updateValue("var_1", 0, "city");
    });

    expect(result.current.state.promptTemplate).toBe("A {{lion, dog}} in {{city, beach}}");
  });

  it("startGenerating sets isGenerating to true", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.actions.startGenerating();
    });
    expect(result.current.state.isGenerating).toBe(true);
    expect(result.current.state.results).toEqual([]);
    expect(result.current.state.error).toBeNull();
  });

  it("setError sets error and stops generating", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.actions.startGenerating();
    });
    act(() => {
      result.current.actions.setError("Something failed");
    });
    expect(result.current.state.error).toBe("Something failed");
    expect(result.current.state.isGenerating).toBe(false);
  });

  it("startGenerating with text model calls API and returns results", async () => {
    const mockTexts = { texts: ["Hello generated text"], creditsRemaining: 90, isText: true };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTexts),
      }),
    );

    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    // Set a text model
    act(() => {
      result.current.actions.setModel("z-text-fast");
    });
    act(() => {
      result.current.actions.setPromptTemplate("{{hello}}");
    });

    await act(async () => {
      result.current.actions.startGenerating();
      // Wait for the Promise.all to resolve
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.state.isGenerating).toBe(false);
    expect(result.current.state.results.length).toBe(1);
    expect(result.current.state.results[0].textContent).toBe("Hello generated text");

    vi.unstubAllGlobals();
  });

  it("updates the shared auth session credits after generation", async () => {
    const sessionAtom = authClient.$store.atoms.session;
    sessionAtom.set({
      ...sessionAtom.get(),
      data: { user: { id: "u1", credits: 100 } },
      isPending: false,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.includes("/get-session")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ user: { id: "u1", credits: 90 } }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ texts: ["Hello"], creditsRemaining: 90 }),
        });
      }),
    );

    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.actions.setModel("z-text-fast");
      result.current.actions.setPromptTemplate("{{hello}}");
    });

    await act(async () => {
      result.current.actions.startGenerating();
      await new Promise((r) => setTimeout(r, 100));
    });

    const session = sessionAtom.get().data as { user: { credits: number } };
    expect(session.user.credits).toBe(90);
    vi.unstubAllGlobals();
  });

  it("optimistically deducts credits as soon as generation starts", async () => {
    const sessionAtom = authClient.$store.atoms.session;
    sessionAtom.set({
      ...sessionAtom.get(),
      data: { user: { id: "u1", credits: 100 } },
      isPending: false,
    });

    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.actions.setModel("z-text-fast");
      result.current.actions.setPromptTemplate("{{hello}}");
    });

    act(() => {
      result.current.actions.startGenerating();
    });

    expect(result.current.state.creditsRemaining).toBe(98);
    expect((sessionAtom.get().data as { user: { credits: number } }).user.credits).toBe(98);

    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ texts: ["Hello"], creditsRemaining: 90 }),
      });
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.state.creditsRemaining).toBe(90);
    vi.unstubAllGlobals();
  });

  it("ignores duplicate startGenerating calls while a batch is already in flight", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ texts: ["Hello"], creditsRemaining: 90 }),
      }),
    );

    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.actions.setModel("z-text-fast");
      result.current.actions.setPromptTemplate("{{hello}}");
    });

    await act(async () => {
      result.current.actions.startGenerating();
      result.current.actions.startGenerating();
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("uploadFile adds attachment and removes it on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "fail" }),
      }),
    );

    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    const file = new File(["test"], "test.png", { type: "image/png" });

    await act(async () => {
      await result.current.actions.uploadFile(file);
    });

    expect(result.current.state.attachedFiles).toHaveLength(0);
    expect(result.current.state.error).toBe("fail");
  });

  it("uploadFile rejects large files before starting network upload", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    const file = new File([new Uint8Array(11 * 1024 * 1024)], "large.png", {
      type: "image/png",
    });

    await act(async () => {
      await result.current.actions.uploadFile(file);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.state.attachedFiles).toHaveLength(0);
    expect(result.current.state.error).toBe("uploadTooLarge");
  });

  it("uploadFile times out instead of leaving an attachment stuck uploading", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      }),
    );

    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    const file = new File(["test"], "test.png", { type: "image/png" });

    await act(async () => {
      const upload = result.current.actions.uploadFile(file);
      await vi.advanceTimersByTimeAsync(30_000);
      await upload;
    });

    expect(result.current.state.attachedFiles).toHaveLength(0);
    expect(result.current.state.error).toBe("uploadTimedOut");
  });

  it("removeAttachment removes attachment by id", () => {
    const { result } = renderHook(() => useGeneratorState(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.state.attachedFiles.push({
        id: "att_1",
        name: "test.png",
        uploading: true,
      });
    });

    act(() => {
      result.current.actions.removeAttachment("att_1");
    });

    expect(result.current.state.attachedFiles.find((f) => f.id === "att_1")).toBeUndefined();
  });
});
