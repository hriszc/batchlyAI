import { Link } from "@tanstack/react-router";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import { Button } from "./ui/button";

export function DefaultNotFound() {
  const { t } = useLanguage();

  return (
    <div className="space-y-3 p-2 text-center">
      <p className="text-6xl">404</p>
      <p className="text-lg font-medium">{t("notFoundDesc")}</p>
      <p className="text-sm text-muted-foreground">{t("notFoundFun")}</p>
      <p className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={() => window.history.back()}>
          {t("goBack")}
        </Button>
        <Button render={<Link to="/" />} variant="secondary" nativeButton={false}>
          {t("home")}
        </Button>
      </p>
    </div>
  );
}
