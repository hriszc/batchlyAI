import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";

export async function handleGetCredits(request: Request): Promise<Response> {
  const auth = createAuth();
  if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return jsonResponse({ error: "Unauthorized" }, 401);

  const binding = getD1Binding();
  if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);

  const db = getDb(binding);
  const [row] = await db
    .select({ credits: userTable.credits })
    .from(userTable)
    .where(eq(userTable.id, session.user.id));

  if (!row) return jsonResponse({ error: "User not found" }, 404);

  return jsonResponse({ credits: row.credits, creditsRemaining: row.credits }, 200);
}

export const Route = createFileRoute("/api/credits")({
  server: {
    handlers: {
      GET: async ({ request }) => handleGetCredits(request),
    },
  },
});
