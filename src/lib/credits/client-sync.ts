import type { QueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { authClient, setAuthClientSessionCredits } from "@/lib/auth/auth-client";
import { authQueryOptions } from "@/lib/auth/queries";

export const CREDIT_UPDATED_EVENT = "batchlyai:credits-updated";

interface CreditResponse {
  credits?: unknown;
  creditsRemaining?: unknown;
}

function readCreditValue(data: CreditResponse): number | null {
  if (typeof data.credits === "number") return data.credits;
  if (typeof data.creditsRemaining === "number") return data.creditsRemaining;
  return null;
}

function emitCreditUpdate(credits: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CREDIT_UPDATED_EVENT, { detail: { credits } }));
}

export function applyCreditsToClientCaches(credits: number, queryClient?: QueryClient): void {
  setAuthClientSessionCredits(credits);

  if (queryClient) {
    queryClient.setQueryData(authQueryOptions().queryKey, (user: unknown) => {
      if (!user || typeof user !== "object") return user;
      return { ...user, credits };
    });
  }

  emitCreditUpdate(credits);
}

export async function fetchCreditsFromServer(init?: RequestInit): Promise<number | null> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const resp = await fetch("/api/credits", {
    ...init,
    credentials: "same-origin",
    headers,
  });

  if (!resp.ok) return null;
  const data = (await resp.json().catch(() => ({}))) as CreditResponse;
  return readCreditValue(data);
}

export function useCreditSync(
  queryClient: QueryClient,
  enabled: boolean,
): () => Promise<number | null> {
  const syncInFlightRef = useRef<Promise<number | null> | null>(null);

  const syncCredits = useCallback(async () => {
    if (!enabled) return null;
    if (syncInFlightRef.current) return syncInFlightRef.current;

    const sync = fetchCreditsFromServer()
      .then((credits) => {
        if (credits != null) {
          applyCreditsToClientCaches(credits, queryClient);
        }
        return credits;
      })
      .finally(() => {
        syncInFlightRef.current = null;
      });

    syncInFlightRef.current = sync;
    return sync;
  }, [enabled, queryClient]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    void syncCredits();

    const handleFocus = () => {
      void syncCredits();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncCredits();
      }
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncCredits();
      }
    }, 15_000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, syncCredits]);

  return syncCredits;
}

export function getAuthClientSessionCredits(): number | null {
  const sessionAtom = authClient.$store.atoms.session as {
    get: () => { data?: { user?: Record<string, unknown> } | null };
  };
  const credits = sessionAtom.get().data?.user?.credits;
  return typeof credits === "number" ? credits : null;
}
