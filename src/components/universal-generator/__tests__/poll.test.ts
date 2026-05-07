import { describe, it, expect, vi, beforeEach } from "vitest";

// We only test the unifiedPoll function logic, not the fetch calls.
// The key fix was moving `finished` array outside the for loop.
import { unifiedPoll } from "../poll";
import type { PromptCombination } from "../types";

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

    const results = await unifiedPoll([
      { predictionIds: ["id1", "id2", "id3"], modelType: "replicate", combination: combo },
    ]);

    // Should have all 3 results, not just the last 2
    expect(results).toHaveLength(3);
    expect(results.filter((r) => r.status === "complete")).toHaveLength(3);
    expect(results.map((r) => r.imageUrl).sort()).toEqual(["url1", "url2", "url3"]);
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

    const results = await unifiedPoll([
      { predictionIds: ["id1", "id2"], modelType: "replicate", combination: combo },
    ]);

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

    const results = await unifiedPoll([
      { predictionIds: ["id1", "id2"], modelType: "replicate", combination: combo },
    ]);

    const succeeded = results.filter((r) => r.status === "complete");
    const failed = results.filter((r) => r.status === "error");
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
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

    const results = await unifiedPoll([
      { predictionIds: ["id_a1", "id_a2"], modelType: "replicate", combination: combo },
      { predictionIds: ["id_b1"], modelType: "replicate", combination: combo2 },
    ]);

    expect(results).toHaveLength(3);
    // combo gets 2 results, combo2 gets 1
    const catResults = results.filter((r) => r.combination.prompt === "A cat");
    const dogResults = results.filter((r) => r.combination.prompt === "A dog");
    expect(catResults).toHaveLength(2);
    expect(dogResults).toHaveLength(1);
  });
});
