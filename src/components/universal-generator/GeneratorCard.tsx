import { WandSparklesIcon, PaperclipIcon, Settings2Icon, ChevronDownIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import { MODELS, MODEL_CATEGORIES } from "./models";
import type { ModelInfo } from "./models";
import type { GeneratorState, GroupId } from "./types";
import { computePromptCombinations } from "./utils";
import { VariableGroupCard } from "./VariableGroupCard";

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

  const combinations = computePromptCombinations(state.promptTemplate, state.variableGroups);
  const comboCount = combinations.length;
  const currentModel = MODELS.find((m) => m.id === state.model);
  const creditEstimate = comboCount * state.quantity * (currentModel?.creditCost ?? 0);
  const hasGroups = state.variableGroups.length > 0;

  const modelLabel = currentModel?.label ?? state.model;

  return (
    <div className="rounded-2xl bg-card shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px]">
      {/* Prompt textarea */}
      <div className="overflow-hidden rounded-t-2xl p-4 pb-2">
        <textarea
          value={state.promptTemplate}
          onChange={(e) => actions.setPromptTemplate(e.target.value)}
          placeholder={t("promptPlaceholder")}
          className="min-h-[80px] w-full resize-none border-0 bg-transparent text-base placeholder:text-muted-foreground/60 focus:ring-0 focus:outline-none"
          rows={3}
        />
      </div>

      {/* Error banner */}
      {state.error && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <span className="flex-1">{state.error}</span>
            <button
              onClick={() => actions.setError(null)}
              className="text-red-400 transition-colors hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Attached files */}
      {state.attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {state.attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-xs"
            >
              <PaperclipIcon className="h-3 w-3 text-muted-foreground" />
              <span className="max-w-[140px] truncate">{file.name}</span>
              {file.uploading && (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-muted-foreground" />
              )}
              {!file.uploading && (
                <button
                  onClick={() => actions.removeAttachment(file.id)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex items-center justify-between gap-2 px-4 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/30 transition-colors hover:bg-muted"
            title={t("inspire")}
          >
            <WandSparklesIcon className="h-4 w-4 text-muted-foreground" />
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/30 transition-colors hover:bg-muted"
            title={t("attach")}
          >
            <PaperclipIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <button
          onClick={actions.startGenerating}
          disabled={comboCount === 0 || state.isGenerating}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[980px] bg-[#0071e3] px-5 py-2 text-[17px] leading-[1.0] font-normal whitespace-nowrap text-white transition-all hover:bg-[#0077ed] focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        >
          {state.isGenerating ? t("generating") : t("generate")}
        </button>
      </div>

      {/* Bottom toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-t bg-muted/20 px-4 py-2.5 text-sm">
        <button
          type="button"
          onClick={() => setShowVariables(!showVariables)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted ${
            showVariables ? "text-[#0071e3]" : "text-muted-foreground"
          }`}
          title={t("advancedSettings")}
        >
          <Settings2Icon className="h-4 w-4" />
        </button>

        <span className="text-muted-foreground/40">|</span>

        {/* Model selector */}
        <div className="relative" ref={modelPickerRef}>
          <button
            type="button"
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="flex items-center gap-1 font-medium whitespace-nowrap text-foreground transition-colors hover:text-[#0071e3]"
          >
            {modelLabel}
            <ChevronDownIcon
              className={`size-3 transition-transform ${showModelPicker ? "rotate-180" : ""}`}
            />
          </button>

          {showModelPicker && (
            <div className="absolute top-full left-0 z-10 mt-2 w-64 overflow-hidden rounded-xl border bg-popover shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px]">
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
                          actions.setModel(m.id);
                          setShowModelPicker(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted ${
                          state.model === m.id ? "bg-[#0071e3]/5 text-[#0071e3]" : "text-foreground"
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
              className={`rounded px-2 py-1 text-xs whitespace-nowrap transition-colors ${
                state.aspectRatio === ratio
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
              onClick={() => actions.setQuantity(qty)}
              className={`h-6 w-6 rounded text-xs transition-colors ${
                state.quantity === qty
                  ? "bg-[#0071e3]/10 font-medium text-[#0071e3]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {qty}
            </button>
          ))}
        </div>

        <span className="text-muted-foreground/40">|</span>

        <span className="whitespace-nowrap text-muted-foreground">
          {t("variants")}: {comboCount}
        </span>

        <span className="text-muted-foreground/40">|</span>

        <span className="whitespace-nowrap text-muted-foreground">
          {t("estimatedCredits")}：{creditEstimate} {t("credits")}
        </span>

        {state.creditsRemaining != null && (
          <>
            <span className="text-muted-foreground/40">|</span>
            <span className="whitespace-nowrap text-muted-foreground">
              {t("credits")}: {state.creditsRemaining}
            </span>
          </>
        )}
      </div>

      {/* Collapsible variable groups editor */}
      {showVariables && hasGroups && (
        <div className="space-y-3 border-t bg-muted/10 px-4 py-3">
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
