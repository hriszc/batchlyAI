import { useState, useRef, useEffect } from "react";
import { WandSparklesIcon, PaperclipIcon, Settings2Icon, ChevronDownIcon } from "lucide-react";
import type { GeneratorState, GroupId } from "./types";
import { computePromptCombinations } from "./utils";
import { VariableGroupCard } from "./VariableGroupCard";
import { MODELS, MODEL_CATEGORIES } from "./models";
import type { ModelInfo } from "./models";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface GeneratorCardProps {
  state: GeneratorState;
  actions: {
    setPromptTemplate: (value: string) => void;
    setQuantity: (value: number) => void;
    setAspectRatio: (value: string) => void;
    setModel: (value: string) => void;
    addValue: (groupId: GroupId) => void;
    updateValue: (groupId: GroupId, index: number, value: string) => void;
    removeValue: (groupId: GroupId, index: number) => void;
    startGenerating: () => void;
    setError: (value: string | null) => void;
    uploadFile: (file: File) => void;
    removeAttachment: (id: string) => void;
  };
}

const ASPECT_RATIOS = ["16:9", "1:1", "9:16"];
const QUANTITIES = [1, 2, 4];

function getCategoryLabel(
  cat: ModelInfo["category"],
  t: ReturnType<typeof useLanguage>["t"],
) {
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

export function GeneratorCard({ state, actions }: GeneratorCardProps) {
  const [showVariables, setShowVariables] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // Close model picker on outside click
  useEffect(() => {
    if (!showModelPicker) return;
    const handler = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showModelPicker]);

  const combinations = computePromptCombinations(
    state.promptTemplate,
    state.variableGroups,
  );
  const comboCount = combinations.length;
  const currentModel = MODELS.find((m) => m.id === state.model);
  const creditEstimate = comboCount * state.quantity * (currentModel?.creditCost ?? 0);
  const hasGroups = state.variableGroups.length > 0;

  const modelLabel = currentModel?.label ?? state.model;

  return (
    <div className="rounded-2xl bg-card shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px]">
      {/* Prompt textarea */}
      <div className="p-4 pb-2 overflow-hidden rounded-t-2xl">
        <textarea
          value={state.promptTemplate}
          onChange={(e) => actions.setPromptTemplate(e.target.value)}
          placeholder={t("promptPlaceholder")}
          className="w-full min-h-[80px] text-base resize-none bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60"
          rows={3}
        />
      </div>

      {/* Error banner */}
      {state.error && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm">
            <span className="flex-1">{state.error}</span>
            <button
              onClick={() => actions.setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Attached files */}
      {state.attachedFiles.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {state.attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border text-xs"
            >
              <PaperclipIcon className="w-3 h-3 text-muted-foreground" />
              <span className="max-w-[140px] truncate">{file.name}</span>
              {file.uploading && (
                <span className="w-3 h-3 border-2 border-muted-foreground/40 border-t-muted-foreground rounded-full animate-spin" />
              )}
              {!file.uploading && (
                <button
                  onClick={() => actions.removeAttachment(file.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons row */}
      <div className="px-4 pb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center justify-center w-9 h-9 rounded-lg border bg-muted/30 hover:bg-muted transition-colors"
            title={t("inspire")}
          >
            <WandSparklesIcon className="w-4 h-4 text-muted-foreground" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) actions.uploadFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center w-9 h-9 rounded-lg border bg-muted/30 hover:bg-muted transition-colors"
            title={t("attach")}
          >
            <PaperclipIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <button
          onClick={actions.startGenerating}
          disabled={comboCount === 0 || state.isGenerating}
          className="inline-flex items-center justify-center whitespace-nowrap text-[17px] font-normal leading-[1.0] transition-all disabled:pointer-events-none disabled:opacity-40 bg-[#0071e3] text-white hover:bg-[#0077ed] active:scale-[0.98] py-2 px-5 h-9 rounded-[980px] gap-2 focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
        >
          {state.isGenerating ? t("generating") : t("generate")}
        </button>
      </div>

      {/* Bottom toolbar */}
      <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center gap-3 text-sm flex-wrap">
        <button
          type="button"
          onClick={() => setShowVariables(!showVariables)}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-muted ${
            showVariables ? "text-[#0071e3]" : "text-muted-foreground"
          }`}
          title={t("advancedSettings")}
        >
          <Settings2Icon className="w-4 h-4" />
        </button>

        <span className="text-muted-foreground/40">|</span>

        {/* Model selector */}
        <div className="relative" ref={modelPickerRef}>
          <button
            type="button"
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="flex items-center gap-1 font-medium text-foreground hover:text-[#0071e3] transition-colors whitespace-nowrap"
          >
            {modelLabel}
            <ChevronDownIcon
              className={`size-3 transition-transform ${showModelPicker ? "rotate-180" : ""}`}
            />
          </button>

          {showModelPicker && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-popover rounded-xl border shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px] z-10 overflow-hidden">
              {MODEL_CATEGORIES.map((cat) => {
                const models = MODELS.filter((m) => m.category === cat.key);
                return (
                  <div key={cat.key}>
                    <div className="px-3 pt-2.5 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {getCategoryLabel(cat.key, t)}
                    </div>
                    {models.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          actions.setModel(m.id);
                          setShowModelPicker(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted ${
                          state.model === m.id
                            ? "text-[#0071e3] bg-[#0071e3]/5"
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

        <span className="text-muted-foreground/40">|</span>

        <div className="flex items-center gap-1">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => actions.setAspectRatio(ratio)}
              className={`px-2 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                state.aspectRatio === ratio
                  ? "bg-[#0071e3]/10 text-[#0071e3] font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>

        <span className="text-muted-foreground/40">|</span>

        <div className="flex items-center gap-1">
          <span className="text-muted-foreground whitespace-nowrap">{t("quantity")}：</span>
          {QUANTITIES.map((qty) => (
            <button
              key={qty}
              type="button"
              onClick={() => actions.setQuantity(qty)}
              className={`w-6 h-6 rounded text-xs transition-colors ${
                state.quantity === qty
                  ? "bg-[#0071e3]/10 text-[#0071e3] font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {qty}
            </button>
          ))}
        </div>

        <span className="text-muted-foreground/40">|</span>

        <span className="text-muted-foreground whitespace-nowrap">
          {t("variants")}: {comboCount}
        </span>

        <span className="text-muted-foreground/40">|</span>

        <span className="text-muted-foreground whitespace-nowrap">
          {t("estimatedCredits")}：{creditEstimate} {t("credits")}
        </span>

        {state.creditsRemaining != null && (
          <>
            <span className="text-muted-foreground/40">|</span>
            <span className="text-muted-foreground whitespace-nowrap">
              {t("credits")}: {state.creditsRemaining}
            </span>
          </>
        )}
      </div>

      {/* Collapsible variable groups editor */}
      {showVariables && hasGroups && (
        <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("detectedGroups", { count: state.variableGroups.length })}
          </p>
          {state.variableGroups.map((group, idx) => (
            <VariableGroupCard
              key={group.id}
              group={group}
              index={idx}
              onAddValue={() => actions.addValue(group.id)}
              onUpdateValue={(i, v) => actions.updateValue(group.id, i, v)}
              onRemoveValue={(i) => actions.removeValue(group.id, i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
