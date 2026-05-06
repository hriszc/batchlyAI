import { describe, it, expect } from "vitest";

import type { GeneratorState } from "../types";
import { reducer, initialState } from "../reducer";

function state(overrides?: Partial<GeneratorState>): GeneratorState {
  return { ...initialState, ...overrides };
}

// ============================================================
describe("reducer", () => {
  // --- SET_PROMPT_TEMPLATE ---
  describe("SET_PROMPT_TEMPLATE", () => {
    it("updates promptTemplate", () => {
      const next = reducer(initialState, {
        type: "SET_PROMPT_TEMPLATE",
        payload: "hello",
      });
      expect(next.promptTemplate).toBe("hello");
    });

    it("does not mutate other fields", () => {
      const next = reducer(initialState, {
        type: "SET_PROMPT_TEMPLATE",
        payload: "hello",
      });
      expect(next.model).toBe(initialState.model);
      expect(next.quantity).toBe(initialState.quantity);
    });
  });

  // --- SYNC_GROUPS_FROM_TEMPLATE ---
  describe("SYNC_GROUPS_FROM_TEMPLATE", () => {
    it("extracts groups from template", () => {
      const next = reducer(state({ promptTemplate: "{{cat, dog}} in {{forest, beach}}" }), {
        type: "SYNC_GROUPS_FROM_TEMPLATE",
      });
      expect(next.variableGroups).toEqual([
        { id: "var_0", values: ["cat", "dog"] },
        { id: "var_1", values: ["forest", "beach"] },
      ]);
    });

    it("is no-op when group count matches", () => {
      const s = state({
        promptTemplate: "{{a, b}}",
        variableGroups: [{ id: "var_0", values: ["x", "y"] }],
      });
      const next = reducer(s, { type: "SYNC_GROUPS_FROM_TEMPLATE" });
      expect(next.variableGroups).toBe(s.variableGroups); // same reference
    });

    it("preserves existing values when merging", () => {
      const s = state({
        promptTemplate: "{{a, b}} in {{c, d}}",
        variableGroups: [{ id: "var_0", values: ["custom1", "custom2"] }],
      });
      const next = reducer(s, { type: "SYNC_GROUPS_FROM_TEMPLATE" });
      expect(next.variableGroups).toEqual([
        { id: "var_0", values: ["custom1", "custom2"] },
        { id: "var_1", values: ["c", "d"] },
      ]);
    });

    it("returns state unchanged for empty template", () => {
      const s = state({ promptTemplate: "" });
      const next = reducer(s, { type: "SYNC_GROUPS_FROM_TEMPLATE" });
      expect(next.variableGroups).toEqual([]);
    });
  });

  // --- SET_QUANTITY ---
  describe("SET_QUANTITY", () => {
    it("updates quantity", () => {
      const next = reducer(initialState, { type: "SET_QUANTITY", payload: 5 });
      expect(next.quantity).toBe(5);
    });
  });

  // --- SET_ASPECT_RATIO ---
  describe("SET_ASPECT_RATIO", () => {
    it("updates aspectRatio", () => {
      const next = reducer(initialState, {
        type: "SET_ASPECT_RATIO",
        payload: "1:1",
      });
      expect(next.aspectRatio).toBe("1:1");
    });
  });

  // --- SET_MODEL ---
  describe("SET_MODEL", () => {
    it("updates model", () => {
      const next = reducer(initialState, {
        type: "SET_MODEL",
        payload: "z-image-fast",
      });
      expect(next.model).toBe("z-image-fast");
    });
  });

  // --- ADD_VALUE ---
  describe("ADD_VALUE", () => {
    it("adds empty string to specified group", () => {
      const s = state({
        variableGroups: [{ id: "var_0", values: ["cat"] }],
      });
      const next = reducer(s, {
        type: "ADD_VALUE",
        payload: { groupId: "var_0" },
      });
      expect(next.variableGroups[0].values).toEqual(["cat", ""]);
    });
  });

  // --- UPDATE_VALUE ---
  describe("UPDATE_VALUE", () => {
    it("updates value at specified index", () => {
      const s = state({
        variableGroups: [{ id: "var_0", values: ["cat", "dog"] }],
      });
      const next = reducer(s, {
        type: "UPDATE_VALUE",
        payload: { groupId: "var_0", index: 1, value: "bird" },
      });
      expect(next.variableGroups[0].values).toEqual(["cat", "bird"]);
    });

    it("returns same values for out-of-bounds index", () => {
      const s = state({
        variableGroups: [{ id: "var_0", values: ["cat"] }],
      });
      const next = reducer(s, {
        type: "UPDATE_VALUE",
        payload: { groupId: "var_0", index: 99, value: "x" },
      });
      expect(next.variableGroups[0].values).toEqual(["cat"]);
    });
  });

  // --- REMOVE_VALUE ---
  describe("REMOVE_VALUE", () => {
    it("removes value at specified index", () => {
      const s = state({
        variableGroups: [{ id: "var_0", values: ["cat", "dog", "bird"] }],
      });
      const next = reducer(s, {
        type: "REMOVE_VALUE",
        payload: { groupId: "var_0", index: 1 },
      });
      expect(next.variableGroups[0].values).toEqual(["cat", "bird"]);
    });

    it("handles removing last value", () => {
      const s = state({
        variableGroups: [{ id: "var_0", values: ["cat"] }],
      });
      const next = reducer(s, {
        type: "REMOVE_VALUE",
        payload: { groupId: "var_0", index: 0 },
      });
      expect(next.variableGroups[0].values).toEqual([]);
    });
  });

  // --- START_GENERATING ---
  describe("START_GENERATING", () => {
    it("sets isGenerating to true", () => {
      const next = reducer(initialState, { type: "START_GENERATING" });
      expect(next.isGenerating).toBe(true);
    });

    it("clears results and error", () => {
      const s = state({
        results: [
          {
            id: "old",
            combination: { variables: {}, prompt: "" },
            imageUrl: null,
            textContent: null,
            watermark: false,
            status: "complete",
          },
        ],
        error: "old error",
      });
      const next = reducer(s, { type: "START_GENERATING" });
      expect(next.results).toEqual([]);
      expect(next.error).toBeNull();
    });
  });

  // --- FINISH_GENERATING ---
  describe("FINISH_GENERATING", () => {
    it("sets results and stops generating", () => {
      const results = [
        {
          id: "r1",
          combination: { variables: { var_0: "a" }, prompt: "test" },
          imageUrl: "http://img.com/1.png",
          textContent: null,
          watermark: false,
          status: "complete" as const,
        },
      ];
      const s = state({ isGenerating: true });
      const next = reducer(s, {
        type: "FINISH_GENERATING",
        payload: results,
      });
      expect(next.isGenerating).toBe(false);
      expect(next.results).toEqual(results);
    });
  });

  // --- SET_ERROR ---
  describe("SET_ERROR", () => {
    it("sets error message and stops generating", () => {
      const s = state({ isGenerating: true });
      const next = reducer(s, {
        type: "SET_ERROR",
        payload: "Something went wrong",
      });
      expect(next.error).toBe("Something went wrong");
      expect(next.isGenerating).toBe(false);
    });

    it("clears error when payload is null", () => {
      const s = state({ error: "existing error" });
      const next = reducer(s, { type: "SET_ERROR", payload: null });
      expect(next.error).toBeNull();
    });
  });

  // --- SET_CREDITS_REMAINING ---
  describe("SET_CREDITS_REMAINING", () => {
    it("updates creditsRemaining", () => {
      const next = reducer(initialState, {
        type: "SET_CREDITS_REMAINING",
        payload: 42,
      });
      expect(next.creditsRemaining).toBe(42);
    });

    it("accepts null", () => {
      const s = state({ creditsRemaining: 50 });
      const next = reducer(s, {
        type: "SET_CREDITS_REMAINING",
        payload: null,
      });
      expect(next.creditsRemaining).toBeNull();
    });
  });

  // --- ADD_ATTACHMENT ---
  describe("ADD_ATTACHMENT", () => {
    it("adds attachment to the list", () => {
      const next = reducer(initialState, {
        type: "ADD_ATTACHMENT",
        payload: { id: "att1", name: "test.png", uploading: true },
      });
      expect(next.attachedFiles).toHaveLength(1);
      expect(next.attachedFiles[0].id).toBe("att1");
    });
  });

  // --- UPDATE_ATTACHMENT ---
  describe("UPDATE_ATTACHMENT", () => {
    it("updates attachment url and key", () => {
      const s = state({
        attachedFiles: [{ id: "att1", name: "test.png", uploading: true }],
      });
      const next = reducer(s, {
        type: "UPDATE_ATTACHMENT",
        payload: { id: "att1", url: "http://cdn.com/test.png", key: "uploads/test.png" },
      });
      expect(next.attachedFiles[0].url).toBe("http://cdn.com/test.png");
      expect(next.attachedFiles[0].key).toBe("uploads/test.png");
      expect(next.attachedFiles[0].uploading).toBe(false);
    });
  });

  // --- REMOVE_ATTACHMENT ---
  describe("REMOVE_ATTACHMENT", () => {
    it("removes attachment by id", () => {
      const s = state({
        attachedFiles: [
          { id: "att1", name: "a.png", uploading: false },
          { id: "att2", name: "b.png", uploading: false },
        ],
      });
      const next = reducer(s, {
        type: "REMOVE_ATTACHMENT",
        payload: "att1",
      });
      expect(next.attachedFiles).toHaveLength(1);
      expect(next.attachedFiles[0].id).toBe("att2");
    });
  });

  // --- Unknown action ---
  describe("unknown action", () => {
    it("returns state unchanged", () => {
      const s = state({ quantity: 99 });
      const next = reducer(s, { type: "UNKNOWN" as any });
      expect(next).toBe(s);
    });
  });

  // --- Immutability ---
  describe("immutability", () => {
    it("never mutates input state", () => {
      const s = state({
        promptTemplate: "test",
        variableGroups: [{ id: "var_0", values: ["a", "b"] }],
        attachedFiles: [{ id: "att1", name: "f.png", uploading: true }],
      });

      const frozen = JSON.parse(JSON.stringify(s));
      reducer(s, { type: "SET_PROMPT_TEMPLATE", payload: "changed" });
      reducer(s, { type: "SET_QUANTITY", payload: 99 });
      reducer(s, { type: "ADD_VALUE", payload: { groupId: "var_0" } });
      reducer(s, { type: "UPDATE_VALUE", payload: { groupId: "var_0", index: 0, value: "z" } });
      reducer(s, { type: "REMOVE_VALUE", payload: { groupId: "var_0", index: 0 } });
      reducer(s, { type: "START_GENERATING" });
      reducer(s, { type: "SET_ERROR", payload: "err" });
      reducer(s, {
        type: "ADD_ATTACHMENT",
        payload: { id: "att2", name: "g.png", uploading: true },
      });
      reducer(s, {
        type: "REMOVE_ATTACHMENT",
        payload: "att1",
      });

      expect(s).toEqual(frozen);
    });
  });
});
