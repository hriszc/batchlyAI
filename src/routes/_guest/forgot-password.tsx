import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, LoaderCircleIcon, MailCheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

const forgotSeo = createPageMeta({
  title: "Forgot Password — BatchlyAI",
  description: "Reset your BatchlyAI account password",
  path: "/forgot-password",
  locale: "en",
  noIndex: true,
});

export const Route = createFileRoute("/_guest/forgot-password")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: forgotSeo.meta,
    links: [{ rel: "canonical", href: "https://batchlyai.com/forgot-password" }],
  }),
  component: ForgotPasswordForm,
});

function ForgotPasswordForm() {
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);

  const { mutate: forgotMutate, isPending } = useMutation({
    mutationFn: async (data: { email: string }) => {
      const result = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        (result as { error: unknown }).error
      ) {
        const err = (result as { error: { message?: string } }).error;
        throw new Error(err.message || "Failed to send reset email");
      }
      return result;
    },
    onSuccess: () => {
      setSent(true);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send reset email");
    },
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    if (!email) return;

    forgotMutate({ email });
  };

  return (
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
        <h1 className="text-xl font-bold">{t("forgotPasswordTitle")}</h1>
      </div>

      {sent ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <MailCheckIcon className="size-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("forgotPasswordSent")}</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            {t("backToLogin")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
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
              <Button type="submit" className="mt-2 w-full" size="lg" disabled={isPending}>
                {isPending && <LoaderCircleIcon className="animate-spin" />}
                {isPending ? t("sending") : t("sendResetLink")}
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="text-center text-sm">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}
