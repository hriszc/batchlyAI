import { describe, it, expect, vi, beforeEach } from "vitest";

// We only test the unifiedPoll function logic, not the fetch calls.
// The key fix was moving `finished` array outside the for loop.
import { unifiedPoll } from "../poll";
import type { GeneratedResult, PromptCombination } from "../types";

const combo: PromptCombination = {
  variables: { var_0: "cat" },
  prompt: "A cat",
};

describe("unifiedPoll", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("accumulates results across multiple poll iterations", async () => {
    // Simulate: first poll returns 1 result, second poll returns the other 2
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                { id: "id1", status: "succeeded", urls: ["url1"], error: null },
                { id: "id2", status: "processing", urls: null, error: null },
                { id: "id3", status: "processing", urls: null, error: null },
              ],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { id: "id2", status: "succeeded", urls: ["url2"], error: null },
              { id: "id3", status: "succeeded", urls: ["url3"], error: null },
            ],
          }),
      });
    }) as unknown as typeof fetch;

    const onResults = vi.fn();
    const results = await unifiedPoll(
      [{ predictionIds: ["id1", "id2", "id3"], modelType: "replicate", combination: combo }],
      undefined,
      undefined,
      1,
      undefined,
      onResults,
    );

    // Should have all 3 results, not just the last 2
    expect(results).toHaveLength(3);
    expect(results.filter((r) => r.status === "complete")).toHaveLength(3);
    expect(
      results.map((r) => r.imageUrl).sort((a, b) => String(a).localeCompare(String(b))),
    ).toEqual(["url1", "url2", "url3"]);
    expect(onResults).toHaveBeenCalledTimes(2);
    expect((onResults.mock.calls[0][0] as GeneratedResult[]).map((r) => r.imageUrl)).toEqual([
      "url1",
    ]);
    expect((onResults.mock.calls[1][0] as GeneratedResult[]).map((r) => r.imageUrl)).toEqual([
      "url2",
      "url3",
    ]);
  });

  it("returns all results when all succeed in first poll", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            { id: "id1", status: "succeeded", urls: ["url1"], error: null },
            { id: "id2", status: "succeeded", urls: ["url2"], error: null },
          ],
        }),
    }) as unknown as typeof fetch;

    const results = await unifiedPoll(
      [{ predictionIds: ["id1", "id2"], modelType: "replicate", combination: combo }],
      undefined,
      undefined,
      1,
    );

    expect(results).toHaveLength(2);
  });

  it("handles failed predictions as errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            { id: "id1", status: "succeeded", urls: ["url1"], error: null },
            { id: "id2", status: "failed", urls: null, error: "error msg" },
          ],
        }),
    }) as unknown as typeof fetch;

    const onError = vi.fn();
    const results = await unifiedPoll(
      [{ predictionIds: ["id1", "id2"], modelType: "replicate", combination: combo }],
      undefined,
      undefined,
      1,
      undefined,
      undefined,
      onError,
    );

    const succeeded = results.filter((r) => r.status === "complete");
    const failed = results.filter((r) => r.status === "error");
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].errorMessage).toBe("error msg");
    expect(onError).toHaveBeenCalledWith("error msg");
  });

  it("marks video poll results as video media", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            { id: "id1", status: "succeeded", urls: ["https://cdn.test/out.mp4"], error: null },
          ],
        }),
    }) as unknown as typeof fetch;

    const results = await unifiedPoll(
      [
        {
          predictionIds: ["id1"],
          modelType: "replicate",
          combination: combo,
          mediaType: "video",
        },
      ],
      undefined,
      undefined,
      1,
    );

    expect(results).toHaveLength(1);
    expect(results[0].mediaType).toBe("video");
    expect(results[0].imageUrl).toBe("https://cdn.test/out.mp4");
  });

  it("handles multiple combinations with separate prediction IDs", async () => {
    const combo2: PromptCombination = { variables: { var_0: "dog" }, prompt: "A dog" };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            { id: "id_a1", status: "succeeded", urls: ["a1"], error: null },
            { id: "id_a2", status: "succeeded", urls: ["a2"], error: null },
            { id: "id_b1", status: "succeeded", urls: ["b1"], error: null },
          ],
        }),
    }) as unknown as typeof fetch;

    const results = await unifiedPoll(
      [
        { predictionIds: ["id_a1", "id_a2"], modelType: "replicate", combination: combo },
        { predictionIds: ["id_b1"], modelType: "replicate", combination: combo2 },
      ],
      undefined,
      undefined,
      1,
    );

    expect(results).toHaveLength(3);
    // combo gets 2 results, combo2 gets 1
    const catResults = results.filter((r) => r.combination.prompt === "A cat");
    const dogResults = results.filter((r) => r.combination.prompt === "A dog");
    expect(catResults).toHaveLength(2);
    expect(dogResults).toHaveLength(1);
  });

  it("confirms timed-out pending IDs with the backend and syncs refunded credits", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            url.includes("timeout=1")
              ? {
                  results: [
                    {
                      id: "id1",
                      status: "failed",
                      urls: null,
                      error: "Generation timed out",
                      creditsRemaining: 80,
                    },
                  ],
                }
              : {
                  results: [{ id: "id1", status: "processing", urls: null, error: null }],
                },
          ),
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const onCreditsRemaining = vi.fn();

    const results = await unifiedPoll(
      [{ predictionIds: ["id1"], modelType: "replicate", combination: combo }],
      3,
      undefined,
      1,
      onCreditsRemaining,
    );

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/generate-status?ids=id1&type=replicate&timeout=1",
      { headers: undefined },
    );
    expect(onCreditsRemaining).toHaveBeenCalledWith(80);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("error");
  });
});
