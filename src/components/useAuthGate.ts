import { useCallback, useRef, useState } from "react";

import { authClient } from "@/lib/auth/auth-client";

export function useAuthGate() {
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session?.user;
  const [showLoginCard, setShowLoginCard] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const checkAuth = useCallback(
    (action: () => void) => {
      if (isLoggedIn) {
        action();
      } else {
        pendingActionRef.current = action;
        setShowLoginCard(true);
      }
    },
    [isLoggedIn],
  );

  const onLoginSuccess = useCallback(() => {
    setShowLoginCard(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) setTimeout(action, 100);
  }, []);

  const closeLogin = useCallback(() => {
    setShowLoginCard(false);
    pendingActionRef.current = null;
  }, []);

  return { showLoginCard, checkAuth, onLoginSuccess, closeLogin };
}
