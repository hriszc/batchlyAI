import { SiGithub, SiGoogle } from "@icons-pack/react-simple-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LoaderCircleIcon, MailCheckIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { SignInSocialButton } from "@/components/sign-in-social-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { env } from "@/env/client";
import { authClient } from "@/lib/auth/auth-client";
import { authQueryOptions } from "@/lib/auth/queries";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

const signupSeo = createPageMeta({
  title: "Sign Up — BatchlyAI",
  description: "Create a BatchlyAI account to start generating AI images",
  path: "/signup",
  locale: "en",
  noIndex: true,
});

export const Route = createFileRoute("/_guest/signup")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: signupSeo.meta,
    links: [{ rel: "canonical", href: "https://batchlyai.com/signup" }],
  }),
  component: SignupForm,
});

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "auto" | "light" | "dark";
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const PRODUCTION_TURNSTILE_SITE_KEY = "0x4AAAAAADOeomQ9BGuE2XWx";

function getTurnstileSiteKey(): string {
  return env.VITE_TURNSTILE_SITE_KEY || (import.meta.env.PROD ? PRODUCTION_TURNSTILE_SITE_KEY : "");
}

function TurnstileField({
  disabled,
  onToken,
}: {
  disabled: boolean;
  onToken: (token: string) => void;
}) {
  const siteKey = getTurnstileSiteKey();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!siteKey || typeof window === "undefined") return;

    const render = () => {
      if (!containerRef.current || widgetIdRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };

    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      render();
      existing.addEventListener("load", render, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", render, { once: true });
    document.head.appendChild(script);
  }, [onToken, siteKey]);

  if (!siteKey) return null;

  return (
    <div
      ref={containerRef}
      aria-disabled={disabled}
      className={disabled ? "pointer-events-none opacity-60" : ""}
    />
  );
}

function SignupForm() {
  const { redirectUrl } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRequired = Boolean(getTurnstileSiteKey());

  const refCode = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("ref") || "";
  }, []);

  const { mutate: signupMutate, isPending } = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
      ref: string;
      turnstileToken: string;
    }) => {
      const result = await authClient.signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
        callbackURL: redirectUrl,
        ref: data.ref || undefined,
        "cf-turnstile-response": data.turnstileToken || undefined,
      } as Record<string, unknown> & {
        name: string;
        email: string;
        password: string;
        callbackURL: string;
      });
      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        (result as { error: unknown }).error
      ) {
        const err = (result as { error: { message?: string } }).error;
        throw new Error(err.message || "Sign up failed");
      }
      queryClient.removeQueries({ queryKey: authQueryOptions().queryKey });
      setSignupEmail(data.email);
      return result;
    },
    onError: (error) => {
      const msg = error.message || "An error occurred while signing up.";
      setErrorMessage(msg);
      toast.error(msg);
      window.turnstile?.reset();
      setTurnstileToken("");
    },
  });

  const handleResend = async () => {
    if (!signupEmail) return;
    setResending(true);
    try {
      await authClient.sendVerificationEmail({ email: signupEmail });
      setResent(true);
      toast.success(t("verifyEmailSent"));
    } catch {
      toast.error("Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (!name || !email || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }

    if (turnstileRequired && !turnstileToken) {
      const msg = "Please complete the human verification.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    signupMutate({ name, email, password, ref: refCode, turnstileToken });
  };

  if (signupEmail) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <MailCheckIcon className="size-12 text-[#0071e3]" />
        <h1 className="text-xl font-bold text-foreground">{t("verifyEmailTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("verifyEmailDesc")}</p>
        <p className="text-sm font-medium text-foreground">{signupEmail}</p>
        {resent ? (
          <p className="text-sm text-green-600">{t("verifyEmailSent")}</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground/70">{t("spamFolderTip")}</p>
            <button
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/30 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {resending && <LoaderCircleIcon className="size-4 animate-spin" />}
              {t("resendVerification")}
            </button>
          </>
        )}
        <Link to="/login" className="text-sm text-[#0071e3] hover:underline">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <Link to="/" className="flex flex-col items-center gap-2 font-medium">
              <div className="relative h-8 w-auto">
                <img
                  src="/logo-light.png"
                  alt="BatchlyAI"
                  className="block h-8 w-auto dark:hidden"
                />
                <img
                  src="/logo-dark.png"
                  alt="BatchlyAI"
                  className="hidden h-8 w-auto dark:block"
                />
              </div>
            </Link>
            <h1 className="text-xl font-bold">{t("signupTitle")}</h1>
          </div>
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("nameLabel")}</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder={t("namePlaceholder")}
                readOnly={isPending}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                readOnly={isPending}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t("passwordLabel")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                readOnly={isPending}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm_password">{t("confirmPasswordLabel")}</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                placeholder={t("confirmPasswordPlaceholder")}
                readOnly={isPending}
                required
              />
            </div>
            <TurnstileField disabled={isPending} onToken={setTurnstileToken} />
            {errorMessage && (
              <div className="rounded-md bg-destructive/15 px-4 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
            <Button
              type="submit"
              className="mt-2 w-full"
              size="lg"
              disabled={isPending || (turnstileRequired && !turnstileToken)}
            >
              {isPending && <LoaderCircleIcon className="animate-spin" />}
              {isPending ? t("signingUp") : t("signupButton")}
            </Button>
          </div>
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              {t("orDivider")}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SignInSocialButton
              provider="github"
              callbackURL={redirectUrl}
              icon={<SiGithub className="size-4" />}
            />
            <SignInSocialButton
              provider="google"
              callbackURL={redirectUrl}
              icon={<SiGoogle className="size-4" />}
            />
          </div>
        </div>
      </form>

      <div className="text-center text-sm">
        {t("hasAccount")}{" "}
        <Link to="/login" className="underline underline-offset-4">
          {t("signInLink")}
        </Link>
      </div>
    </div>
  );
}
