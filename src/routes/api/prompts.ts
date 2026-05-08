import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq, like } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { getDb } from "@/lib/db";
import { savedPrompt } from "@/lib/db/schema/data-flywheel.schema";

export async function handleGetPrompts(request: Request): Promise<Response> {
  const auth = createAuth();
  if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return jsonResponse({ error: "Unauthorized" }, 401);

  const binding = getD1Binding();
  if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
  const db = getDb(binding);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const tag = url.searchParams.get("tag") || "";

  try {
    const conditions = [eq(savedPrompt.userId, session.user.id)];
    if (search) {
      conditions.push(like(savedPrompt.name, `%${search}%`));
    }

    const rows = await db
      .select()
      .from(savedPrompt)
      .where(and(...conditions))
      .orderBy(desc(savedPrompt.updatedAt));

    let result = rows;
    if (tag) {
      result = result.filter((r) => {
        try {
          const tags = JSON.parse(r.tags || "[]") as string[];
          return tags.includes(tag);
        } catch {
          return false;
        }
      });
    }

    return jsonResponse({ prompts: result }, 200);
  } catch (err) {
    return jsonResponse({ error: "Failed to fetch prompts" }, 500);
  }
}

export async function handleSavePrompt(request: Request): Promise<Response> {
  const auth = createAuth();
  if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return jsonResponse({ error: "Unauthorized" }, 401);

  const binding = getD1Binding();
  if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
  const db = getDb(binding);

  try {
    const body = (await request.json()) as {
      name: string;
      promptTemplate: string;
      variableGroups?: string;
      model?: string;
      tags?: string;
    };
    if (!body.name?.trim() || !body.promptTemplate?.trim()) {
      return jsonResponse({ error: "Name and prompt template are required" }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    await db.insert(savedPrompt).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      name: body.name.trim(),
      promptTemplate: body.promptTemplate.trim(),
      variableGroups: body.variableGroups || null,
      model: body.model || null,
      tags: body.tags || "[]",
      createdAt: now,
      updatedAt: now,
    });

    return jsonResponse({ success: true }, 201);
  } catch (err) {
    return jsonResponse({ error: "Failed to save prompt" }, 500);
  }
}

export async function handleDeletePrompt(request: Request): Promise<Response> {
  const auth = createAuth();
  if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return jsonResponse({ error: "Unauthorized" }, 401);

  const binding = getD1Binding();
  if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
  const db = getDb(binding);

  try {
    const { id } = (await request.json()) as { id: string };
    if (!id) return jsonResponse({ error: "Missing id" }, 400);

    await db
      .delete(savedPrompt)
      .where(and(eq(savedPrompt.id, id), eq(savedPrompt.userId, session.user.id)));

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    return jsonResponse({ error: "Failed to delete prompt" }, 500);
  }
}

export const Route = createFileRoute("/api/prompts")({
  server: {
    handlers: {
      GET: async ({ request }) => handleGetPrompts(request),
      POST: async ({ request }) => handleSavePrompt(request),
      DELETE: async ({ request }) => handleDeletePrompt(request),
    },
  },
});
