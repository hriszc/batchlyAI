import { ChevronDownIcon } from "lucide-react";
import { useRef, useEffect, useState } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import { MODELS, MODEL_CATEGORIES } from "./models";
import type { ModelInfo } from "./models";

function getCategoryLabel(cat: ModelInfo["category"], t: ReturnType<typeof useLanguage>["t"]) {
  const map: Record<string, string> = {
    image: t("modelImage"),
    video: t("modelVideo"),
    text: t("modelText"),
    music: t("modelMusic"),
  };
  return map[cat];
}

function getTierLabel(tier: ModelInfo["tier"], t: ReturnType<typeof useLanguage>["t"]) {
  return tier === "fast" ? t("tierFast") : t("tierPro");
}

interface ModelPickerProps {
  currentModel: string;
  onSelect: (modelId: string) => void;
}

export function ModelPicker({ currentModel, onSelect }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const model = MODELS.find((m) => m.id === currentModel);
  const label = model?.label ?? currentModel;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 font-medium whitespace-nowrap text-foreground transition-colors hover:text-accent-blue"
      >
        {label}
        <ChevronDownIcon className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="popover-enter absolute top-full left-0 z-10 mt-2 w-64 overflow-hidden rounded-xl border bg-popover shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px]">
          {MODEL_CATEGORIES.map((cat) => {
            const models = MODELS.filter((m) => m.category === cat.key);
            return (
              <div key={cat.key}>
                <div className="px-3 pt-2.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {getCategoryLabel(cat.key, t)}
                </div>
                {models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelect(m.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted ${
                      currentModel === m.id
                        ? "bg-accent-blue/5 text-accent-blue"
                        : "text-foreground"
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {getTierLabel(m.tier, t)}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
