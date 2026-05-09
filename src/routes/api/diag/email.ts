import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { sendEmail } from "@/lib/email";

export const Route = createFileRoute("/api/diag/email")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return jsonResponse({ error: "Auth not available" }, 501);

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const envExists = !!(globalThis as Record<string, unknown>).__env__;
        const env = (globalThis as Record<string, unknown>).__env__ as
          | Record<string, unknown>
          | undefined;
        const hasEmail = !!env?.EMAIL;

        // Try CF Email binding directly
        let cfError: string | null = null;
        if (hasEmail) {
          try {
            const binding = env!.EMAIL as {
              send: (opts: Record<string, unknown>) => Promise<void>;
            };
            await binding.send({
              to: session.user.email,
              from: "support@batchlyai.com",
              subject: "BatchlyAI Email Diagnostic",
              html: "<p>This is a diagnostic email from BatchlyAI.</p>",
            });
            return jsonResponse({ ok: true, method: "cf-email", email: session.user.email }, 200);
          } catch (err) {
            cfError = err instanceof Error ? err.message : String(err);
          }
        }

        // Try MailChannels fallback
        try {
          const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: session.user.email }] }],
              from: { email: "support@batchlyai.com", name: "BatchlyAI" },
              subject: "BatchlyAI Email Diagnostic",
              content: [{ type: "text/html", value: "<p>Diagnostic email.</p>" }],
            }),
          });
          if (resp.ok) {
            return jsonResponse(
              { ok: true, method: "mailchannels", email: session.user.email },
              200,
            );
          }
          const mcBody = await resp.text();
          return jsonResponse(
            {
              ok: false,
              error: `MailChannels returned ${resp.status}`,
              detail: mcBody.slice(0, 200),
              cfError,
              envExists,
              hasEmail,
            },
            500,
          );
        } catch (err) {
          const mcError = err instanceof Error ? err.message : String(err);
          return jsonResponse(
            {
              ok: false,
              error: "Both methods failed",
              cfError,
              mcError,
              envExists,
              hasEmail,
            },
            500,
          );
        }
      },
    },
  },
});
