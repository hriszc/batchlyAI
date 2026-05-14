import { useEffect, useRef, useState } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import type { GeneratedResult, VariableGroup } from "./types";

interface ShareScreenshotProps {
  promptTemplate: string;
  variableGroups: VariableGroup[];
  results: GeneratedResult[];
  onComplete: () => void;
  onError: (msg: string) => void;
}

async function imageUrlToDataUri(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Image request failed: ${resp.status}`);
  const blob = await resp.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function getCanvasScale(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const baseScale = isMobileViewport() ? 1 : 2;
  const maxPixels = isMobileViewport() ? 8_000_000 : 24_000_000;
  const estimatedPixels = rect.width * rect.height * baseScale * baseScale;
  if (estimatedPixels <= maxPixels) return baseScale;
  return Math.max(0.5, Math.sqrt(maxPixels / (rect.width * rect.height)));
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const [meta, data] = dataUrl.split(",");
        const mime = meta.match(/data:(.*);base64/)?.[1] || "image/png";
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        resolve(new Blob([bytes], { type: mime }));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Canvas export failed"));
      }
    }, "image/png");
  });
}

async function saveOrShareBlob(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "BatchlyAI",
      });
      return;
    } catch {
      // Fall back to downloading the file.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function ShareScreenshot({
  promptTemplate,
  variableGroups,
  results,
  onComplete,
  onError,
}: ShareScreenshotProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const [dataUris, setDataUris] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [captured, setCaptured] = useState(false);

  // 1. Convert all result images to data URIs
  useEffect(() => {
    let cancelled = false;
    async function loadImages() {
      const uris: Record<string, string> = {};
      for (const r of results) {
        if (!r.imageUrl) continue;
        try {
          uris[r.id] = await imageUrlToDataUri(r.imageUrl);
        } catch {
          // Keep the original URL as fallback
          uris[r.id] = r.imageUrl;
        }
      }
      if (!cancelled) {
        setDataUris(uris);
        setLoading(false);
      }
    }
    void loadImages();
    return () => {
      cancelled = true;
    };
  }, [results]);

  // 2. After DOM renders with data URIs, capture with html2canvas
  useEffect(() => {
    if (loading || captured || !cardRef.current) return;

    let cancelled = false;

    // Wait for all images in the card to load
    const images = cardRef.current.querySelectorAll("img");
    void Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          }),
      ),
    ).then(async () => {
      if (cancelled || !cardRef.current) return;

      try {
        const { default: html2canvas } = await import("html2canvas");
        const scale = getCanvasScale(cardRef.current);
        const canvas = await html2canvas(cardRef.current, {
          scale,
          backgroundColor: "#ffffff",
          useCORS: true,
          allowTaint: false,
          onclone: (clonedDoc: Document) => {
            // html2canvas cannot parse oklch() color functions from Tailwind v4.
            // Replace them with safe fallback colors instead of removing the
            // entire <style> tags (which would break all class-based styling).
            clonedDoc.querySelectorAll("style").forEach((el: HTMLStyleElement) => {
              el.textContent = el
                .textContent!.replace(/oklch\([^)]+\)/g, "#000000")
                .replace(/oklch\([^)]+\)/g, "#000000");
            });
            // Also fix inline/dynamic oklch in the card itself
            clonedDoc.querySelectorAll("[style*='oklch']").forEach((el: Element) => {
              (el as HTMLElement).style.cssText = (el as HTMLElement).style.cssText.replace(
                /oklch\([^)]+\)/g,
                "#000000",
              );
            });
          },
        });

        const blob = await canvasToBlob(canvas);
        if (cancelled) return;
        await saveOrShareBlob(blob, `batchlyai-${Date.now()}.png`);
        setCaptured(true);
        onComplete();
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Screenshot failed";
          onError(message);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loading, captured, onComplete, onError]);

  // Loading state
  if (loading) {
    return (
      <div className="fixed top-0 left-0 z-[9999] flex h-full w-full items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="rounded-2xl bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
          <p className="text-sm text-foreground">{t("shareLoading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-2xl bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
          <p className="text-sm text-foreground">{t("shareLoading")}</p>
        </div>
      </div>
      <div
        ref={cardRef}
        style={{ width: 820, position: "absolute", top: 0, left: 0 }}
        className="bg-white font-sans"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-10 py-6">
          <img src="/logo-light.png" alt="BatchlyAI" className="h-10 w-auto" />
          <span className="text-sm text-gray-400">batchlyai.com</span>
        </div>

        {/* Prompt */}
        <div className="px-10 py-6">
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
            {t("sharePromptTemplate")}
          </h3>
          <p className="mb-4 text-base leading-relaxed text-gray-800">{promptTemplate}</p>

          {variableGroups.filter((g) => g.values.length > 0).length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                {t("shareVariableGroups")}
              </h3>
              {variableGroups
                .filter((g) => g.values.length > 0)
                .map((g, i) => (
                  <div key={g.id} className="mb-1 text-sm text-gray-600">
                    <span className="font-medium text-gray-800">
                      {t("shareGroup", { index: i + 1 })}:
                    </span>{" "}
                    {g.values.join(", ")}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="px-10 pb-10">
          <h3 className="mb-4 text-xs font-semibold tracking-wide text-gray-400 uppercase">
            {t("shareResults", { count: results.length })}
          </h3>
          <div className="space-y-8">
            {results.map((result) => (
              <div key={result.id}>
                <div className="overflow-hidden rounded-lg border bg-gray-50">
                  {dataUris[result.id] ? (
                    <img
                      src={dataUris[result.id]}
                      alt={result.combination.prompt}
                      crossOrigin="anonymous"
                      className="w-full"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-gray-100 text-gray-400">
                      {t("shareImageFailed")}
                    </div>
                  )}
                  <div className="px-4 py-3">
                    <p className="text-sm leading-relaxed text-gray-800">
                      {result.combination.prompt}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                      {Object.entries(result.combination.variables).map(([k, v]) => (
                        <span key={k}>
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-10 py-6 text-center">
          <p className="text-xs text-gray-400">
            {t("shareGeneratedBy")}
            <span className="font-semibold text-gray-500">BatchlyAI</span>
          </p>
          <p className="mt-0.5 text-xs text-gray-300">batchlyai.com</p>
        </div>
      </div>
    </div>
  );
}
