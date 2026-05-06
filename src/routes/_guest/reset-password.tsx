import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

const resetPasswordSeo = createPageMeta({
  title: "Reset Password — BatchlyAI",
  description: "Set a new password for your BatchlyAI account",
  path: "/reset-password",
  locale: "en",
  noIndex: true,
});

export const Route = createFileRoute("/_guest/reset-password")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: resetPasswordSeo.meta,
    links: [{ rel: "canonical", href: "https://batchlyai.com/reset-password" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  }, []);

  const logoHeader = (
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
      <h1 className="text-xl font-bold">{t("resetPasswordTitle")}</h1>
    </div>
  );

  const { mutate: resetPasswordMutate, isPending } = useMutation({
    mutationFn: async (data: { newPassword: string; token: string }) => {
      const result = await authClient.resetPassword({
        newPassword: data.newPassword,
        token: data.token,
      });
      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        (result as { error: unknown }).error
      ) {
        const err = (result as { error: { message?: string } }).error;
        throw new Error(err.message || "Password reset failed");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Password reset successfully!");
      void navigate({ to: "/login" });
    },
    onError: (error) => {
      const msg = error.message || "An error occurred while resetting your password.";
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("new_password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (!newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }

    resetPasswordMutate({ newPassword, token });
  };

  if (!token) {
    return (
      <div className="flex flex-col gap-6">
        {logoHeader}
        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-sm text-muted-foreground">
            {t("invalidResetLink")}
          </p>
          <a
            href="/forgot-password"
            className="text-sm underline underline-offset-4"
          >
            {t("requestNewLink")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          {logoHeader}
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="new_password">{t("newPassword")}</Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                placeholder={t("newPasswordPlaceholder")}
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
              {isPending ? t("resettingPassword") : t("resetPasswordButton")}
            </Button>
          </div>
        </div>
      </form>

      <div className="text-center text-sm">
        <Link to="/login" className="underline underline-offset-4">
          {t("signInLink")}
        </Link>
      </div>
    </div>
  );
}
