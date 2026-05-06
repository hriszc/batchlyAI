import { Link, useNavigate } from "@tanstack/react-router";
import {
  SunIcon,
  MoonIcon,
  LogInIcon,
  LogOutIcon,
  UserIcon,
  PlusIcon,
  Share2Icon,
  GiftIcon,
  ChevronDownIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CreditPurchasePopover } from "@/components/CreditPurchasePopover";
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
    void navigate({ to: "/" });
  };

  // Referral stats
  interface ReferralStats {
    tier: string;
    totalReferrals: number;
    totalCreditsEarned: number;
    commissionTotal: number;
    referralCode: string | null;
    shareUrl: string | null;
  }
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/referral/stats")
      .then((r) => r.json())
      .then((data: ReferralStats & { error?: string }) => {
        if (!data.error) setReferralStats(data);
      })
      .catch(() => {});
  }, [session?.user]);

  const handleGenerateReferralCode = useCallback(async () => {
    setReferralLoading(true);
    try {
      const resp = await fetch("/api/referral/generate-code", { method: "POST" });
      const data = (await resp.json()) as {
        code?: string;
        shareUrl?: string;
        error?: string;
      };
      if (data.code) {
        // Re-fetch stats
        const statsResp = await fetch("/api/referral/stats");
        const statsData = (await statsResp.json()) as ReferralStats & {
          error?: string;
        };
        if (!statsData.error) setReferralStats(statsData);
        toast.success(t("referralCreated"));
      } else {
        toast.error(data.error || t("referralFailed"));
      }
    } catch {
      toast.error(t("referralFailed"));
    } finally {
      setReferralLoading(false);
    }
  }, []);

  const handleCopyReferralLink = useCallback(async () => {
    if (referralStats?.shareUrl) {
      await navigator.clipboard.writeText(referralStats.shareUrl);
      toast.success(t("referralCopied"));
    }
  }, [referralStats]);

  return (
    <div className="fixed top-0 right-0 z-50 flex items-center gap-1 p-3">
      {session?.user ? (
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setShowPurchase(!showPurchase)}
              title={t("buyCreditsTitle")}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-[#0071e3]/15 px-2.5 text-xs font-medium text-[#0071e3] backdrop-blur-sm transition-colors hover:bg-[#0071e3]/25"
            >
              <PlusIcon className="size-3" />
              {t("buyCredits")}
            </button>
            {showPurchase && <CreditPurchasePopover onClose={() => setShowPurchase(false)} />}
          </div>

          {/* Referral Section */}
          {referralStats?.referralCode ? (
            <>
              <button
                onClick={handleCopyReferralLink}
                title={t("copyReferralLink")}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-green-500/15 px-2.5 text-xs font-medium text-green-600 backdrop-blur-sm transition-colors hover:bg-green-500/25"
              >
                <Share2Icon className="size-3" />
                {referralStats.totalReferrals > 0
                  ? `${referralStats.totalReferrals} ${t("invites")}`
                  : t("copyReferralLink")}
              </button>
              {referralStats.tier !== "none" && (
                <span className="inline-flex h-8 items-center justify-center rounded-full bg-amber-500/15 px-2 text-xs font-semibold text-amber-600 backdrop-blur-sm">
                  {referralStats.tier}
                </span>
              )}
              {referralStats.totalCreditsEarned > 0 && (
                <span className="inline-flex h-8 items-center justify-center gap-0.5 rounded-full bg-muted/80 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                  <span className="font-semibold text-green-600">
                    +{referralStats.totalCreditsEarned}
                  </span>
                  {t("earned")}
                </span>
              )}
            </>
          ) : (
            <button
              onClick={handleGenerateReferralCode}
              disabled={referralLoading}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-purple-500/15 px-2.5 text-xs font-medium text-purple-600 backdrop-blur-sm transition-colors hover:bg-purple-500/25 disabled:opacity-50"
            >
              <GiftIcon className="size-3" />
              {referralLoading ? "..." : t("getReferralLink")}
            </button>
          )}

          <span className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-muted/80 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <span className="font-semibold text-[#0071e3]">
              {((session.user as Record<string, unknown>).credits as number) ?? 0}
            </span>
            {t("credits")}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-muted/80 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
            >
              <UserIcon className="size-3" />
              {session.user.name || session.user.email}
              <ChevronDownIcon className="size-3" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl border bg-popover shadow-lg">
                <a href="/my/generations" className="block px-3 py-2 text-xs hover:bg-muted">
                  {t("myGenerations")}
                </a>
                <a href="/my/prompts" className="block px-3 py-2 text-xs hover:bg-muted">
                  {t("myPrompts")}
                </a>
                <a href="/my/works" className="block px-3 py-2 text-xs hover:bg-muted">
                  {t("myWorks")}
                </a>
                <div className="border-t" />
                <button onClick={handleSignOut} className="block w-full px-3 py-2 text-left text-xs hover:bg-muted">
                  {t("signOut")}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Link
          to="/login"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-muted/80 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogInIcon className="size-3" />
          {t("loginNav")}
        </Link>
      )}
      <button
        onClick={() => setLanguage(language === "en" ? "zh" : "en")}
        className="inline-flex h-8 items-center justify-center rounded-full bg-muted/80 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        aria-label={t("switchLang")}
      >
        {language === "en" ? "CN" : "EN"}
      </button>
      <button
        onClick={toggleTheme}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        aria-label={t("switchTheme")}
      >
        {resolved === "dark" ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
      </button>
    </div>
  );
}
