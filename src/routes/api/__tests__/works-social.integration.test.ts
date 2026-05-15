import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations, createTestDb, seedUser } from "#test/db-setup";
import { work, workComment, workLike } from "@/lib/db/schema";

const mocks = vi.hoisted(() => ({
  createAuth: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  createAuth: mocks.createAuth,
}));

vi.mock("@/lib/db", () => ({
  getDb: (binding: unknown) => binding,
}));

vi.mock("@/lib/cloudflare/bindings", () => ({
  getD1Binding: () =>
    (globalThis as { __env__?: { batchlyai_db?: unknown } }).__env__?.batchlyai_db,
}));

import { handleGetWorkComments, handlePostWorkComment } from "@/routes/api/works/comment";
import { handlePostWorkLike } from "@/routes/api/works/like";

function jsonRequest(path: string, body: unknown, origin = "https://batchlyai.com") {
  return new Request(`https://batchlyai.com${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify(body),
  });
}

function seedPublishedWork(db: ReturnType<typeof createTestDb>, overrides = {}) {
  db.insert(work)
    .values({
      id: "work-1",
      userId: "author",
      title: "Published work",
      description: "A public work",
      category: "product",
      promptTemplate: "A {{product}}",
      variableGroups: "[]",
      coverUrl: "/api/generation-files/works/work-1/0.png",
      resultUrls: JSON.stringify(["/api/generation-files/works/work-1/0.png"]),
      model: "z-image-fast",
      isPublished: 1,
      likeCount: 0,
      commentCount: 0,
      remixCount: 0,
      createdAt: 1,
      publishedAt: 1,
      ...overrides,
    })
    .run();
}

describe("works social API handlers", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    applyMigrations(db);
    vi.clearAllMocks();
    mocks.createAuth.mockReturnValue({ api: { getSession: mocks.getSession } });
    mocks.getSession.mockResolvedValue({ user: { id: "viewer" } });
    (globalThis as { __env__?: { batchlyai_db: typeof db } }).__env__ = { batchlyai_db: db };
    seedUser(db, { id: "author", email: "author@example.com", name: "Author" });
    seedUser(db, { id: "viewer", email: "viewer@example.com", name: "Viewer" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { __env__?: unknown }).__env__;
  });

  it("rejects like requests from invalid origins before auth", async () => {
    const response = await handlePostWorkLike(
      jsonRequest("/api/works/like", { workId: "work-1" }, "https://evil.example"),
    );

    expect(response.status).toBe(403);
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("requires authentication for likes", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await handlePostWorkLike(jsonRequest("/api/works/like", { workId: "work-1" }));

    expect(response.status).toBe(401);
  });

  it("toggles a like and keeps the work like count in sync", async () => {
    seedPublishedWork(db);

    const likedResponse = await handlePostWorkLike(
      jsonRequest("/api/works/like", { workId: "work-1" }),
    );
    const likedBody = await likedResponse.json();

    expect(likedResponse.status).toBe(200);
    expect(likedBody).toEqual({ liked: true, likeCount: 1 });
    expect(db.select().from(workLike).all()).toHaveLength(1);

    const unlikedResponse = await handlePostWorkLike(
      jsonRequest("/api/works/like", { workId: "work-1" }),
    );
    const unlikedBody = await unlikedResponse.json();

    expect(unlikedResponse.status).toBe(200);
    expect(unlikedBody).toEqual({ liked: false, likeCount: 0 });
    expect(db.select().from(workLike).all()).toHaveLength(0);
  });

  it("does not allow likes for unpublished works", async () => {
    seedPublishedWork(db, { isPublished: 0 });

    const response = await handlePostWorkLike(jsonRequest("/api/works/like", { workId: "work-1" }));

    expect(response.status).toBe(404);
  });

  it("creates trimmed comments and lists them with user names", async () => {
    seedPublishedWork(db);

    const createResponse = await handlePostWorkComment(
      jsonRequest("/api/works/comment", { workId: "work-1", content: "  Useful prompt  " }),
    );
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createBody).toEqual({ success: true });

    const [storedComment] = db.select().from(workComment).all();
    expect(storedComment.content).toBe("Useful prompt");

    const [storedWork] = db.select().from(work).where(eq(work.id, "work-1")).all();
    expect(storedWork.commentCount).toBe(1);

    const listResponse = await handleGetWorkComments(
      new Request("https://batchlyai.com/api/works/comment?workId=work-1"),
    );
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.comments).toEqual([
      expect.objectContaining({
        workId: "work-1",
        userId: "viewer",
        content: "Useful prompt",
        userName: "Viewer",
      }),
    ]);
  });

  it("validates comment input", async () => {
    seedPublishedWork(db);

    const missingResponse = await handlePostWorkComment(
      jsonRequest("/api/works/comment", { workId: "work-1", content: "   " }),
    );
    const longResponse = await handlePostWorkComment(
      jsonRequest("/api/works/comment", { workId: "work-1", content: "x".repeat(1001) }),
    );
    const missingWorkIdResponse = await handleGetWorkComments(
      new Request("https://batchlyai.com/api/works/comment"),
    );

    expect(missingResponse.status).toBe(400);
    expect(longResponse.status).toBe(400);
    expect(missingWorkIdResponse.status).toBe(400);
  });
});
