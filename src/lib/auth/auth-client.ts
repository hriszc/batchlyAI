import { createAuthClient } from "better-auth/react";

/**
 * https://better-auth.com/docs/concepts/client
 *
 * Our better-auth server instance lives in the TanStack Start server,
 * so authClient should only be used on the client (event handlers, effects, etc).
 *
 * For server/SSR operations, prefer `auth.api` instead, and wrap in a serverFn if needed.
 */
export const authClient = createAuthClient({
  // Use same origin - works on both custom domain and workers.dev
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});

interface AuthSessionStoreValue {
  data: {
    user?: Record<string, unknown>;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

interface WritableAtomLike<T> {
  get: () => T;
  set: (value: T) => void;
}

export function setAuthClientSessionCredits(credits: number): void {
  const sessionAtom = authClient.$store.atoms.session as WritableAtomLike<AuthSessionStoreValue>;
  const current = sessionAtom.get();
  if (!current.data?.user) return;

  sessionAtom.set({
    ...current,
    data: {
      ...current.data,
      user: {
        ...current.data.user,
        credits,
      },
    },
  });
}
