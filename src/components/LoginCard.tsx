import { LogInIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface LoginCardProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function LoginCard({ onSuccess, onClose }: LoginCardProps) {
  const { t } = useLanguage();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    setErrorMessage(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    if (!email || !password) {
      setIsPending(false);
      return;
    }

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
      });
      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        (result as { error: unknown }).error
      ) {
        const err = (result as { error: { message?: string } }).error;
        throw new Error(err.message || "Sign in failed");
      }
      toast.success("Logged in successfully");
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setErrorMessage(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="login-card-backdrop"
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />
      {/* Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-card shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px]">
          <div className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <LogInIcon className="size-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t("loginTitle")}</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="login-email">{t("emailLabel")}</Label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    readOnly={isPending}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="login-password">{t("passwordLabel")}</Label>
                  <Input
                    id="login-password"
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

                <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                  {isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                  {isPending ? t("loggingIn") : t("loginButton")}
                </Button>
              </div>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              {t("noAccount")}{" "}
              <a href="/signup" className="underline underline-offset-4 hover:text-foreground">
                {t("signUpLink")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
