import { Link, useNavigate } from "@tanstack/react-router";
import { SunIcon, MoonIcon, LogInIcon, LogOutIcon, UserIcon } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function SettingsBar() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

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
    void navigate({ to: "/" });
  };

  return (
    <div className="fixed top-0 right-0 z-50 flex items-center gap-1 p-3">
      {session?.user ? (
        <div className="flex items-center gap-1">
          <span className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-muted/80 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <span className="font-semibold text-[#0071e3]">
              {((session.user as Record<string, unknown>).credits as number) ?? 0}
            </span>
            credits
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
