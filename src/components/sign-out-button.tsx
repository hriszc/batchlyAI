import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { authQueryOptions } from "@/lib/auth/queries";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function SignOutButton() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Button
      onClick={async () => {
        await authClient.signOut({
          fetchOptions: {
            onResponse: async () => {
              queryClient.setQueryData(authQueryOptions().queryKey, null);
              await router.invalidate();
            },
          },
        });
      }}
      type="button"
      className="w-fit"
      variant="destructive"
      size="lg"
    >
      {t("signOut")}
    </Button>
  );
}
