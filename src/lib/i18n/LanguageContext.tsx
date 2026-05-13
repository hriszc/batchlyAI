import { createContext, use, useState, useEffect, useCallback } from "react";

import { getLanguageCookie, parseStoredLanguage } from "./locale-routing";
import type { Language, TranslationKey } from "./translations";
import { translations } from "./translations";

type SetLanguageOptions = {
  persist?: boolean;
};

type LanguageContextState = {
  language: Language;
  setLanguage: (lang: Language, options?: SetLanguageOptions) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

export const LanguageContext = createContext<LanguageContextState>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";
  if (window.location.pathname === "/") return "en";
  try {
    const stored = parseStoredLanguage(localStorage.getItem("language"));
    if (stored) return stored;
  } catch {
    // localStorage not available
  }
  const cookieLanguage = getLanguageCookie(document.cookie);
  if (cookieLanguage) return cookieLanguage;
  return "en";
}

function persistLanguage(lang: Language): void {
  try {
    localStorage.setItem("language", lang);
  } catch {
    // ignore
  }
  try {
    document.cookie = `language=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start with "en" for SSR hydration consistency
  const [language, setLanguageState] = useState<Language>("en");

  // Sync to explicit stored preference after hydration (SSR-safe).
  // Browser language is handled by locale routing so "/" can remain English.
  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored !== "en") {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = useCallback((lang: Language, options?: SetLanguageOptions) => {
    if (options?.persist !== false) {
      persistLanguage(lang);
    }
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

  return <LanguageContext value={{ language, setLanguage, t }}>{children}</LanguageContext>;
}

export function useLanguage() {
  return use(LanguageContext);
}
