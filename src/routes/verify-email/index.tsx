import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2Icon, MailCheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const searchSchema = z.object({
  email: z.string().optional(),
});

export const Route = createFileRoute("/verify-email/")({
  validateSearch: searchSchema,
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { email } = Route.useSearch();
  const { t } = useLanguage();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await authClient.sendVerificationEmail({ email });
      setResent(true);
      toast.success(t("verifyEmailSent"));
    } catch {
      toast.error("Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="w-full max-w-sm text-center">
        <MailCheckIcon className="mx-auto size-12 text-[#0071e3]" />
        <h1 className="mt-4 text-xl font-bold text-foreground">{t("verifyEmailTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("verifyEmailDesc")}</p>
        {email && <p className="mt-1 text-sm font-medium text-foreground">{email}</p>}

        {resent ? (
          <p className="mt-4 text-sm text-green-600">{t("verifyEmailSent")}</p>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-muted-foreground/70">
              Didn't receive the email? Check your spam folder.
            </p>
            <button
              onClick={handleResend}
              disabled={resending || !email}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/30 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {resending && <Loader2Icon className="size-4 animate-spin" />}
              Resend verification email
            </button>
          </div>
        )}

        <Link to="/login" className="mt-6 inline-block text-sm text-[#0071e3] hover:underline">
          Back to login
        </Link>
      </div>
    </main>
  );
}
