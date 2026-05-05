import { SunIcon, MoonIcon, LogInIcon, LogOutIcon, UserIcon, PlusIcon } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import { useEffect } from "react";

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
            className="inline-flex items-center justify-center h-8 px-2.5 rounded-full text-xs font-medium bg-[#0071e3]/15 backdrop-blur-sm text-[#0071e3] hover:bg-[#0071e3]/25 transition-colors gap-1"
          >
            <PlusIcon className="size-3" />
            {t("buyCredits")}
          </button>
          <span className="inline-flex items-center justify-center h-8 px-2.5 rounded-full text-xs font-medium bg-muted/80 backdrop-blur-sm text-muted-foreground gap-1">
            <span className="text-[#0071e3] font-semibold">
              {(session.user as Record<string, unknown>).credits as number ?? 0}
            </span>
            {t("credits")}
          </span>
          <span className="inline-flex items-center justify-center h-8 px-2.5 rounded-full text-xs font-medium bg-muted/80 backdrop-blur-sm text-muted-foreground gap-1.5">
            <UserIcon className="size-3" />
            {session.user.name || session.user.email}
          </span>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Sign out"
          >
            <LogOutIcon className="size-3" />
          </button>
        </div>
      ) : (
        <Link
          to="/login"
          className="inline-flex items-center justify-center h-8 px-2.5 rounded-full text-xs font-medium bg-muted/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors gap-1.5"
        >
          <LogInIcon className="size-3" />
          Login
        </Link>
      )}
      <button
        onClick={() => setLanguage(language === "en" ? "zh" : "en")}
        className="inline-flex items-center justify-center h-8 px-2.5 rounded-full text-xs font-medium bg-muted/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={`Switch to ${language === "en" ? "Chinese" : "English"}`}
      >
        {language === "en" ? "CN" : "EN"}
      </button>
      <button
        onClick={toggleTheme}
        className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
      >
        {resolved === "dark" ? (
          <SunIcon className="size-3.5" />
        ) : (
          <MoonIcon className="size-3.5" />
        )}
      </button>
    </div>
  );
}
