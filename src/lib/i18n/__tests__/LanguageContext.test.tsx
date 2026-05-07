import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LanguageProvider, useLanguage } from "@/lib/i18n/LanguageContext";

function TestConsumer() {
  const { language, t, setLanguage } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="title">{t("siteTitle")}</span>
      <button onClick={() => setLanguage("zh")}>Switch to ZH</button>
    </div>
  );
}

describe("LanguageProvider", () => {
  it("provides default language en", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("title").textContent).toBe("BatchlyAI");
  });

  it("switches language when setLanguage is called", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>,
    );
    await user.click(screen.getByText("Switch to ZH"));
    expect(screen.getByTestId("lang").textContent).toBe("zh");
  });

  it("defaults to en for unsupported stored language", () => {
    localStorage.setItem("language", "fr");
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>,
    );
    // Should still show en (fr is not supported)
    expect(screen.getByTestId("lang").textContent).toBe("en");
  });
});
