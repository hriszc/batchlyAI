import { SiGithub, SiGoogle } from "@icons-pack/react-simple-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SignInSocialButton } from "@/components/sign-in-social-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/error-message";
import { authQueryOptions } from "@/lib/auth/queries";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

const loginSeo = createPageMeta({
  title: "Login — BatchlyAI",
  description: "Log in to your BatchlyAI account to generate AI images",
  path: "/login",
  locale: "en",
  noIndex: true,
});

export const Route = createFileRoute("/_guest/login")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: loginSeo.meta,
    links: [{ rel: "canonical", href: "https://batchlyai.com/login" }],
  }),
  component: LoginForm,
});

function LoginForm() {
  const { redirectUrl } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useLanguage();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: emailLoginMutate, isPending } = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const result = await authClient.signIn.email({
        ...data,
        callbackURL: redirectUrl,
      });
      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        (result as { error: unknown }).error
      ) {
        throw new Error(
          getAuthErrorMessage((result as { error: unknown }).error, "Sign in failed"),
        );
      }
      void queryClient.invalidateQueries({ queryKey: authQueryOptions().queryKey });
      void router.invalidate();
      return result;
    },
    onError: (error) => {
      const msg = getAuthErrorMessage(error, "An error occurred while signing in.");
      setErrorMessage(msg);
      if (msg.toLowerCase().includes("verify") || msg.toLowerCase().includes("email")) {
        setErrorMessage(`${msg} Click "Resend verification email" to receive a new link.`);
      }
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) return;

    emailLoginMutate({ email, password });
  };

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
            <h1 className="text-xl font-bold">{t("loginTitle")}</h1>
          </div>
          <div className="flex flex-col gap-5">
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
            {errorMessage && (
              <div className="rounded-md bg-destructive/15 px-4 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
            <Button type="submit" className="mt-2 w-full" size="lg" disabled={isPending}>
              {isPending && <LoaderCircleIcon className="animate-spin" />}
              {isPending ? t("loggingIn") : t("loginButton")}
            </Button>
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {t("forgotPassword")}
              </Link>
            </div>
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
        {t("noAccount")}{" "}
        <Link to="/signup" className="underline underline-offset-4">
          {t("signUpLink")}
        </Link>
      </div>
    </div>
  );
}
