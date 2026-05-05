import { Link, useNavigate } from "@tanstack/react-router";
import { SunIcon, MoonIcon, LogInIcon, LogOutIcon, UserIcon, PlusIcon } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { useTheme } from "@/components/theme-provider";
import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function SettingsBar() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  // Handle Stripe redirects
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "success") {
      toast.success(t("purchaseSuccess"));
      const url = new URL(window.location.href);
      url.searchParams.delete("purchase");
      window.history.replaceState({}, "", url.toString());
    } else if (params.get("purchase") === "canceled") {
      toast.error(t("purchaseCanceled"));
      const url = new URL(window.location.href);
      url.searchParams.delete("purchase");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const resolved =
    theme === "system"
      ? typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  const toggleTheme = () => {
    setTheme(resolved === "dark" ? "light" : "dark");
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/" });
  };

  const handleBuyCredits = async () => {
    try {
      const resp = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await resp.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Failed to start checkout");
    }
  };

  return (
    <div className="fixed top-0 right-0 z-50 flex items-center gap-1 p-3">
      {session?.user ? (
        <div className="flex items-center gap-1">
          <button
            onClick={handleBuyCredits}
            title={t("buyCreditsTitle")}
            className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-[#0071e3]/15 px-2.5 text-xs font-medium text-[#0071e3] backdrop-blur-sm transition-colors hover:bg-[#0071e3]/25"
          >
            <PlusIcon className="size-3" />
            {t("buyCredits")}
          </button>
          <span className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-muted/80 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <span className="font-semibold text-[#0071e3]">
              {((session.user as Record<string, unknown>).credits as number) ?? 0}
            </span>
            {t("credits")}
          </span>
          <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-muted/80 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <UserIcon className="size-3" />
            {session.user.name || session.user.email}
          </span>
          <button
            onClick={handleSignOut}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOutIcon className="size-3" />
          </button>
        </div>
      ) : (
        <Link
          to="/login"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-muted/80 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogInIcon className="size-3" />
          Login
        </Link>
      )}
      <button
        onClick={() => setLanguage(language === "en" ? "zh" : "en")}
        className="inline-flex h-8 items-center justify-center rounded-full bg-muted/80 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Switch to ${language === "en" ? "Chinese" : "English"}`}
      >
        {language === "en" ? "CN" : "EN"}
      </button>
      <button
        onClick={toggleTheme}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
      >
        {resolved === "dark" ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
      </button>
    </div>
  );
}
