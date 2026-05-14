import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/error-message";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface SocialLoginButtonProps {
  provider: string;
  icon: React.ReactNode;
  disabled?: boolean;
  callbackURL: string;
}

const providerLabels: Record<string, string> = {
  github: "GitHub",
  google: "Google",
};

export function SignInSocialButton(props: SocialLoginButtonProps) {
  const providerLabel =
    providerLabels[props.provider] ??
    props.provider.charAt(0).toUpperCase() + props.provider.slice(1);
  const { t } = useLanguage();

  const mutation = useMutation({
    mutationFn: async () =>
      await authClient.signIn.social(
        {
          provider: props.provider,
          callbackURL: props.callbackURL,
        },
        {
          onError: ({ error }) => {
            toast.error(
              getAuthErrorMessage(error, `An error occurred during ${providerLabel} sign-in.`),
            );
          },
        },
      ),
  });

  return (
    <Button
      variant="secondary"
      className="w-full"
      type="button"
      disabled={mutation.isSuccess || mutation.isPending || props.disabled}
      onClick={() => mutation.mutate()}
    >
      {props.icon}
      {t("loginWith", { provider: providerLabel })}
    </Button>
  );
}
