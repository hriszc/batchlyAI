import { createContext, use, useState, useEffect, useCallback } from "react";
import type { Language, TranslationKey } from "./translations";
import { translations } from "./translations";

type LanguageContextState = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

export const LanguageContext = createContext<LanguageContextState>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || "";
  return lang.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  useEffect(() => {
    const stored = localStorage.getItem("language") as Language | null;
    setLanguageState(
      stored === "en" || stored === "zh" ? stored : detectBrowserLanguage(),
    );
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem("language", lang);
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      let text: string = translations[language][key];
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [language],
  );

  return (
    <LanguageContext value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext>
  );
}

export function useLanguage() {
  return use(LanguageContext);
}
