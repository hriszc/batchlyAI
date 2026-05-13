"use client";

import { XIcon, PlusIcon, Loader2Icon } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";

import { MODELS } from "@/components/universal-generator/models";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const PRESETS = [1, 5, 10, 50, 100];
const PRICE_PER_UNIT = 10;
const CREDITS_PER_UNIT = 1000;

interface CreditPurchasePopoverProps {
  onClose: () => void;
}

export function CreditPurchasePopover({ onClose }: CreditPurchasePopoverProps) {
  const { t } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [customValue, setCustomValue] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Focus custom input when toggled
  useEffect(() => {
    if (isCustom) inputRef.current?.focus();
  }, [isCustom]);

  const effectiveQuantity = isCustom ? Math.max(1, parseInt(customValue, 10) || 0) : quantity;
  const totalPrice = effectiveQuantity * PRICE_PER_UNIT;
  const totalCredits = effectiveQuantity * CREDITS_PER_UNIT;
  const currencySymbol = "$";

  const equivalence = useMemo(() => {
    const cheapestImage = MODELS.filter((m) => m.category === "image").reduce((a, b) =>
      a.creditCost < b.creditCost ? a : b,
    );
    const cheapestText = MODELS.filter((m) => m.category === "text").reduce((a, b) =>
      a.creditCost < b.creditCost ? a : b,
    );
    const cheapestVideo = MODELS.filter((m) => m.category === "video").reduce((a, b) =>
      a.creditCost < b.creditCost ? a : b,
    );
    return {
      images: Math.floor(totalCredits / cheapestImage.creditCost),
      texts: Math.floor(totalCredits / cheapestText.creditCost),
      videoSeconds: Math.floor(totalCredits / cheapestVideo.creditCost),
    };
  }, [totalCredits]);

  const handleBuy = useCallback(async () => {
    if (effectiveQuantity < 1) return;
    setLoading(true);
    try {
      const { track } = await import("@/lib/analytics/client");
      track("checkout_started", { quantity: effectiveQuantity });
      const resp = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: effectiveQuantity }),
      });
      const data = (await resp.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || t("checkoutFailed"));
      }
    } catch {
      toast.error(t("checkoutFailed"));
    } finally {
      setLoading(false);
    }
  }, [effectiveQuantity, t]);

  return (
    <>
      {/* Backdrop — mobile only */}
      <button
        type="button"
        aria-label="Close checkout"
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm sm:hidden"
        onClick={onClose}
      />

      {/* Centering wrapper — mobile only */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:static">
        <div
          ref={popoverRef}
          className="popover-enter w-full max-w-sm overflow-hidden rounded-xl border bg-popover shadow-lg sm:absolute sm:top-full sm:right-0 sm:mt-1 sm:w-72"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold text-foreground">{t("buyCredits")}</span>
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>

          <div className="space-y-3 px-4 py-3">
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setIsCustom(false);
                    setQuantity(p);
                    setCustomValue("");
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    !isCustom && quantity === p
                      ? "bg-accent-blue/10 text-accent-blue"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {p}x
                </button>
              ))}
              <button
                onClick={() => {
                  setIsCustom(true);
                  setCustomValue(customValue || String(quantity));
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  isCustom
                    ? "bg-accent-blue/10 text-accent-blue"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {t("custom")}
              </button>
            </div>

            {/* Custom input */}
            {isCustom && (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="number"
                  min={1}
                  max={100}
                  value={customValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d+$/.test(v)) setCustomValue(v);
                  }}
                  placeholder={t("enterQuantity")}
                  className="h-8 w-24 rounded-lg border bg-muted/30 px-2.5 text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-accent-blue focus:outline-none"
                />
                <span className="text-xs text-muted-foreground">
                  {currencySymbol}
                  {PRICE_PER_UNIT}/{t("pack")}
                </span>
              </div>
            )}

            {/* Summary */}
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>
                  {effectiveQuantity} {t("packs")}
                </span>
                <span>
                  {currencySymbol}
                  {totalPrice.toLocaleString()}
                </span>
              </div>
              <div className="mt-0.5 flex justify-between font-medium text-foreground">
                <span>{t("totalCredits")}</span>
                <span className="text-accent-blue">{totalCredits.toLocaleString()}</span>
              </div>
              <div className="mt-1 border-t pt-1 text-[10px] text-muted-foreground/70">
                <span>
                  ~{equivalence.images} images · ~{equivalence.texts} texts · ~
                  {equivalence.videoSeconds}s video
                </span>
              </div>
            </div>

            {/* Buy button */}
            <button
              onClick={handleBuy}
              disabled={loading || effectiveQuantity < 1}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-accent-blue text-sm font-medium text-white transition-all hover:bg-accent-blue-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
            >
              {loading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              {loading
                ? t("processing")
                : `${t("pay")} ${currencySymbol}${totalPrice.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
