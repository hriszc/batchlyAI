import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircleIcon, LoaderCircleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

const forgotPasswordSeo = createPageMeta({
  title: "Forgot Password — BatchlyAI",
  description: "Reset your BatchlyAI account password",
  path: "/forgot-password",
  locale: "en",
  noIndex: true,
});

export const Route = createFileRoute("/_guest/forgot-password")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: forgotPasswordSeo.meta,
    links: [{ rel: "canonical", href: "https://batchlyai.com/forgot-password" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const { mutate: forgetPasswordMutate, isPending } = useMutation({
    mutationFn: async (data: { email: string }) => {
      // forgetPassword is typed as lost on Better Auth v1.6.9 client types
      const result = await (
        authClient as unknown as {
          forgetPassword: (opts: {
            email: string;
            redirectTo: string;
          }) => Promise<{ error?: { message?: string } } | undefined>;
        }
      ).forgetPassword({
        email: data.email,
        redirectTo: "/reset-password",
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
      setEmailSent(true);
    },
    onError: (error) => {
      const msg = error.message || "An error occurred while sending the reset email.";
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    if (!email) return;

    forgetPasswordMutate({ email });
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
            <h1 className="text-xl font-bold">{t("forgotPasswordTitle")}</h1>
          </div>

          <div className="flex flex-col gap-5">
            {emailSent ? (
              <div className="flex flex-col items-center gap-4 rounded-md bg-primary/10 px-4 py-6 text-center">
                <CheckCircleIcon className="size-8 text-primary" />
                <p className="text-sm font-medium">{t("resetEmailSent")}</p>
              </div>
            ) : (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  {t("forgotPasswordDesc")}
                </p>
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
                {errorMessage && (
                  <div className="rounded-md bg-destructive/15 px-4 py-2 text-sm text-destructive">
                    {errorMessage}
                  </div>
                )}
                <Button type="submit" className="mt-2 w-full" size="lg" disabled={isPending}>
                  {isPending && <LoaderCircleIcon className="animate-spin" />}
                  {isPending ? t("sendingResetEmail") : t("sendResetEmail")}
                </Button>
              </>
            )}
          </div>
        </div>
      </form>

      <div className="text-center text-sm">
        {t("rememberPassword")}{" "}
        <Link to="/login" className="underline underline-offset-4">
          {t("signInLink")}
        </Link>
      </div>
    </div>
  );
}
