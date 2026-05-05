import { Link } from "@tanstack/react-router";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "./ui/button";

export function DefaultNotFound() {
  const { t } = useLanguage();

  return (
    <div className="space-y-2 p-2">
      <p>{t("notFoundDesc")}</p>
      <p className="flex flex-wrap items-center gap-2">
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
