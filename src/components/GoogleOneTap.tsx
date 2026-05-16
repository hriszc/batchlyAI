"use client";

import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { env } from "@/env/client";
import { authClient } from "@/lib/auth/auth-client";

// Extend window type for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: string;
          }) => void;
          prompt: (
            momentListener?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              isDismissedMoment: () => boolean;
              getNotDisplayedReason: () => string;
              getSkippedReason: () => string;
              getDismissedReason: () => string;
            }) => void,
          ) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export function GoogleOneTap() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const scriptId = "google-gsi-script";

    // Only show One-Tap for unauthenticated users
    if (session?.user) return;

    async function getGoogleClientId(): Promise<string> {
      if (env.VITE_GOOGLE_CLIENT_ID) return env.VITE_GOOGLE_CLIENT_ID;

      try {
        const resp = await fetch("/api/auth/google-one-tap-config", {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });
        if (!resp.ok) return "";
        const data = (await resp.json()) as { clientId?: unknown };
        return typeof data.clientId === "string" ? data.clientId : "";
      } catch {
        return "";
      }
    }

    void getGoogleClientId().then((clientId) => {
      // Only if Google OAuth is configured
      if (cancelled || !clientId) return;

      if (document.getElementById(scriptId)) return;

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            try {
              const resp = await fetch("/api/auth/google-one-tap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: response.credential }),
              });

              if (resp.ok) {
                // Reload to refresh session state
                void router.invalidate();
              }
            } catch {
              // Silently fail — user can try again
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
        });

        window.google.accounts.id.prompt();
      };

      document.head.appendChild(script);
    });

    return () => {
      cancelled = true;
      const el = document.getElementById(scriptId);
      if (el) el.remove();
      window.google?.accounts?.id?.cancel();
    };
  }, [session?.user, router]);

  return null;
}
