import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { LanguageProvider, useLanguage } from "../LanguageContext";

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <LanguageProvider>{children}</LanguageProvider>;
  };
}

describe("LanguageContext", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    vi.restoreAllMocks();
  });

  // --- Initial language selection ---
  it("defaults to en when no browser preference and no localStorage", () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });
    expect(result.current.language).toBe("en");
  });

  it("keeps provider language en for Chinese browser on first visit", () => {
    vi.stubGlobal("navigator", { language: "zh-CN" });
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });
    expect(result.current.language).toBe("en");
  });

  it("keeps provider language en for zh-TW browser on first visit", () => {
    vi.stubGlobal("navigator", { language: "zh-TW" });
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });
    expect(result.current.language).toBe("en");
  });

  it("returns en for non-Chinese languages", () => {
    vi.stubGlobal("navigator", { language: "fr" });
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });
    expect(result.current.language).toBe("en");
  });

  // --- localStorage preference overrides browser ---
  it("uses localStorage 'zh' even when browser is English", () => {
    localStorage.setItem("language", "zh");
    vi.stubGlobal("navigator", { language: "en-US" });
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });
    expect(result.current.language).toBe("zh");
  });

  it("uses localStorage 'en' even when browser is Chinese", () => {
    localStorage.setItem("language", "en");
    vi.stubGlobal("navigator", { language: "zh-CN" });
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });
    expect(result.current.language).toBe("en");
  });

  it("uses language cookie when localStorage has no preference", () => {
    document.cookie = "language=zh; Path=/";
    vi.stubGlobal("navigator", { language: "en-US" });
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });
    expect(result.current.language).toBe("zh");
  });

  // --- setLanguage persists ---
  it("setLanguage updates language and persists to localStorage", () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });

    act(() => result.current.setLanguage("zh"));
    expect(result.current.language).toBe("zh");
    expect(localStorage.getItem("language")).toBe("zh");

    act(() => result.current.setLanguage("en"));
    expect(result.current.language).toBe("en");
    expect(localStorage.getItem("language")).toBe("en");
  });

  it("setLanguage can update language without persisting route-forced language", () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });

    act(() => result.current.setLanguage("zh", { persist: false }));
    expect(result.current.language).toBe("zh");
    expect(localStorage.getItem("language")).toBeNull();
  });

  // --- Translation function ---
  it("t() returns translated string", () => {
    window.history.replaceState({}, "", "/discover");
    localStorage.setItem("language", "zh");
    vi.stubGlobal("navigator", { language: "en-US" });
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });
    expect(result.current.language).toBe("zh");
    // "generate" → "开始生成" in zh
    expect(result.current.t("generate")).toBe("开始生成");
  });

  it("t() returns English when language is en", () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });
    expect(result.current.t("generate")).toBe("Generate");
  });

  // --- Edge case: server-side rendering ---
  it("defaults to en when navigator is undefined (SSR)", () => {
    vi.stubGlobal("navigator", undefined);
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });
    expect(result.current.language).toBe("en");
  });

  // --- Edge case: corrupted localStorage ---
  it("ignores invalid localStorage value and falls back to browser", () => {
    localStorage.setItem("language", "de");
    vi.stubGlobal("navigator", { language: "zh-CN" });
    const { result } = renderHook(() => useLanguage(), { wrapper: createWrapper() });
    expect(result.current.language).toBe("en");
  });
});
