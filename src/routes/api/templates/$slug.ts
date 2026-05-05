import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";
import { template as templateTable } from "@/lib/db/schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

export const Route = createFileRoute("/api/templates/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const slug = (params as { _splat: string })._splat;
        const binding = getD1Binding();
        if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);

        const [row] = await db.select().from(templateTable).where(eq(templateTable.slug, slug));

        if (!row) {
          return jsonResponse({ error: "Template not found" }, 404);
        }

        return jsonResponse(
          {
            ...row,
            variableGroups: JSON.parse(row.variableGroups),
          },
          200,
        );
      },
    },
  },
});
