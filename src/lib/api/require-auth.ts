import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";

export async function requireAuth(request: Request) {
  const auth = createAuth();
  if (!auth) return { error: jsonResponse({ error: "Auth unavailable" }, 501) };

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return { error: jsonResponse({ error: "Unauthorized" }, 401) };

  return { userId: session.user.id, user: session.user };
}
