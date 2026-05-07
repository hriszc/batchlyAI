import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockRunExpandLLM: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({ api: { getSession: mocks.mockGetSession } }),
}));

vi.mock("@/lib/ai", () => ({
  runExpandLLM: mocks.mockRunExpandLLM,
}));

vi.mock("@/lib/cache/prompt-cache", () => ({
  getExpandCache: () => Promise.resolve(null),
  setExpandCache: () => Promise.resolve(),
}));

import { handleExpandVars } from "@/routes/api/expand-vars";

function makeReq(body: Record<string, unknown>): Request {
  return { json: () => Promise.resolve(body) } as unknown as Request;
}

describe("handleExpandVars", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } }); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns 401 when not authenticated", async () => {
    mocks.mockGetSession.mockResolvedValue(null);
    const resp = await handleExpandVars(makeReq({}));
    expect(resp.status).toBe(401);
  });

  it("returns 400 when descriptions is missing", async () => {
    const resp = await handleExpandVars(makeReq({}));
    expect(resp.status).toBe(400);
  });

  it("returns 400 when descriptions is empty", async () => {
    const resp = await handleExpandVars(makeReq({ descriptions: [] }));
    expect(resp.status).toBe(400);
  });

  it("returns 400 when more than 10 descriptions", async () => {
    const resp = await handleExpandVars(makeReq({ descriptions: Array(11).fill("test") }));
    expect(resp.status).toBe(400);
  });

  it("returns expanded values on valid request", async () => {
    mocks.mockRunExpandLLM.mockResolvedValue(["red", "blue", "green"]);
    const resp = await handleExpandVars(makeReq({ descriptions: ["colors"] }));
    expect(resp.status).toBe(200);
    const body = await resp.json() as { results: Record<string, string[]> };
    expect(body.results.colors).toEqual(["red", "blue", "green"]);
  });
});
