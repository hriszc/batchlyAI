import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "@/lib/auth/auth";

export const Route = createFileRoute("/api/auth-test")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const steps: Record<string, unknown> = {};

        // Step 1: Check createAuth
        try {
          const auth = createAuth();
          steps.authCreated = !!auth;
          if (!auth) {
            steps.error = "createAuth returned null";
            return new Response(JSON.stringify(steps, null, 2), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Step 2: Check if auth.handler exists
          steps.hasHandler = typeof auth.handler === "function";
          steps.hasApi = !!auth.api;
          steps.apiMethods = auth.api
            ? Object.keys(auth.api).filter((k) => !k.startsWith("_") && !k.startsWith("$"))
            : [];

          // Step 3: Try to read request body (clone test)
          try {
            const cloneReq = request.clone();
            const text = await cloneReq.text();
            steps.cloneBodyOk = true;
            steps.bodyLength = text.length;
            steps.bodyPreview = text.slice(0, 200);
          } catch (e) {
            steps.cloneBodyError = String(e);
          }

          // Step 4: Try getSession to test D1 queries
          try {
            const session = await auth.api.getSession({ headers: request.headers });
            steps.getSessionOk = true;
            steps.hasSession = !!session;
          } catch (e) {
            steps.getSessionError = String(e);
          }

          // Step 5: Try sign-in with a test request
          try {
            const testBody = JSON.stringify({
              email: "test@example.com",
              password: "test123456",
            });
            const testReq = new Request("https://batchlyai.com/api/auth/sign-in/email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: testBody,
            });
            const resp = await auth.handler(testReq);
            steps.handlerTestStatus = resp.status;
            steps.handlerTestStatusText = resp.statusText;
            const respText = await resp.text();
            steps.handlerTestBody = respText.slice(0, 500);
          } catch (e) {
            steps.handlerTestError = String(e);
            steps.handlerTestErrorStack = (e as Error).stack?.slice(0, 500);
          }
        } catch (e) {
          steps.fatalError = String(e);
          steps.fatalErrorStack = (e as Error).stack?.slice(0, 500);
        }

        return new Response(JSON.stringify(steps, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
