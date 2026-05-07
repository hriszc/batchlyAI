import { Settings2Icon } from "lucide-react";
import { useState } from "react";

import { MODELS } from "./models";
import { useLanguage } from "@/lib/i18n/LanguageContext";

import { ModelPicker } from "./ModelPicker";

const ASPECT_RATIOS = ["16:9", "1:1", "9:16"];
const QUANTITIES = [1, 2, 4];

interface GeneratorToolbarProps {
  showVariables: boolean;
  onToggleVariables: () => void;
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  aspectRatio: string;
  onSetAspectRatio: (ratio: string) => void;
  quantity: number;
  onSetQuantity: (qty: number) => void;
  comboCount: number;
  groupCount: number;
  hasGroups: boolean;
  creditEstimate: number;
  creditsRemaining: number | null;
}

export function GeneratorToolbar({
  showVariables,
  onToggleVariables,
  currentModel,
  onSelectModel,
  aspectRatio,
  onSetAspectRatio,
  quantity,
  onSetQuantity,
  comboCount,
  groupCount,
  hasGroups,
  creditEstimate,
  creditsRemaining,
}: GeneratorToolbarProps) {
  const { t } = useLanguage();
  const [showSettings, setShowSettings] = useState(false);
  const modelInfo = MODELS.find((m) => m.id === currentModel);
  const isImage = modelInfo?.category === "image";
  const isText = modelInfo?.category === "text";

  return (
    <div className="flex flex-wrap items-center gap-3 border-t bg-muted/20 px-4 py-2.5 text-sm">
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted ${
            showSettings ? "text-[#0071e3]" : "text-muted-foreground"
          }`}
          title={t("advancedSettings")}
        >
          <Settings2Icon className="h-4 w-4" />
        </button>
        {showSettings && (
          <div className="absolute bottom-full left-0 z-10 mb-2 w-56 rounded-xl border bg-popover p-3 shadow-lg">
            <p className="mb-2 text-xs font-semibold text-foreground">{modelInfo?.label} Settings</p>
            {isImage && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Aspect ratio: use the ratio buttons in the toolbar.
                </p>
              </div>
            )}
            {isText && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Text models generate creative responses. Try different prompts for varied results.
                </p>
              </div>
            )}
            {!isImage && !isText && (
              <p className="text-xs text-muted-foreground">
                Video generation uses the selected quantity and aspect ratio.
              </p>
            )}
            <button
              onClick={() => setShowSettings(false)}
              className="mt-2 w-full rounded bg-muted py-1 text-xs"
            >
              Close
            </button>
          </div>
        )}
      </div>

      <span className="text-muted-foreground/40">|</span>

      <ModelPicker currentModel={currentModel} onSelect={onSelectModel} />

      <span className="text-muted-foreground/40">|</span>

      <div className="flex items-center gap-1">
        {ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio}
            type="button"
            onClick={() => onSetAspectRatio(ratio)}
            className={`rounded px-2 py-1 text-xs whitespace-nowrap transition-colors ${
              aspectRatio === ratio
                ? "bg-[#0071e3]/10 font-medium text-[#0071e3]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {ratio}
          </button>
        ))}
      </div>

      <span className="text-muted-foreground/40">|</span>

      <div className="flex items-center gap-1">
        <span className="whitespace-nowrap text-muted-foreground">{t("quantity")}：</span>
        {QUANTITIES.map((qty) => (
          <button
            key={qty}
            type="button"
            onClick={() => onSetQuantity(qty)}
            className={`h-6 w-6 rounded text-xs transition-colors ${
              quantity === qty
                ? "bg-[#0071e3]/10 font-medium text-[#0071e3]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {qty}
          </button>
        ))}
      </div>

      <span className="text-muted-foreground/40">|</span>

      <span
        className={`whitespace-nowrap ${
          comboCount > 500
            ? "font-medium text-red-500"
            : comboCount > 100
              ? "text-yellow-600"
              : "text-muted-foreground"
        }`}
      >
        {hasGroups && `${groupCount} ${t("groups")} · `}
        {comboCount} {t("variants")}
      </span>

      <span className="text-muted-foreground/40">|</span>

      <span className="whitespace-nowrap text-muted-foreground">
        {t("estimatedCredits")}：{creditEstimate} {t("credits")}
      </span>

      {comboCount > 500 && (
        <span className="text-xs font-medium whitespace-nowrap text-red-500">
          {t("tooManyCombinations")}
        </span>
      )}
      {comboCount > 100 && comboCount <= 500 && (
        <span className="text-xs whitespace-nowrap text-yellow-600">{t("manyCombinations")}</span>
      )}

      {creditsRemaining != null && (
        <>
          <span className="text-muted-foreground/40">|</span>
          <span className="whitespace-nowrap text-muted-foreground">
            {t("credits")}: {creditsRemaining}
          </span>
        </>
      )}
    </div>
  );
}
