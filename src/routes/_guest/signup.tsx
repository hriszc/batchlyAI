import { SiGithub, SiGoogle } from "@icons-pack/react-simple-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SignInSocialButton } from "@/components/sign-in-social-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";
import { authQueryOptions } from "@/lib/auth/queries";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export const Route = createFileRoute("/_guest/signup")({
  component: SignupForm,
});

function SignupForm() {
  const { redirectUrl } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: signupMutate, isPending } = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      const result = await authClient.signUp.email({
        ...data,
        callbackURL: redirectUrl,
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
      void navigate({ to: redirectUrl });
      return result;
    },
    onError: (error) => {
      const msg = error.message || "An error occurred while signing up.";
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

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

    signupMutate({ name, email, password });
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <Link to="/" className="flex flex-col items-center gap-2 font-medium">
              <span className="text-2xl font-semibold tracking-[-0.028em]">BatchlyAI</span>
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
            {errorMessage && (
              <div className="rounded-md bg-destructive/15 px-4 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
            <Button type="submit" className="mt-2 w-full" size="lg" disabled={isPending}>
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
              disabled={true}
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
