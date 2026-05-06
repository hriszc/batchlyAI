import {
  WandSparklesIcon,
  PaperclipIcon,
  Settings2Icon,
  ChevronDownIcon,
  Loader2Icon,
  Undo2Icon,
  SaveIcon,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import { getRandomPrompt } from "./inspire-prompts";
import { MODELS, MODEL_CATEGORIES } from "./models";
import type { ModelInfo } from "./models";
import type { GeneratorState, GroupId } from "./types";
import { useExpandVariables } from "./useExpandVariables";
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

  // Save prompt modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveTags, setSaveTags] = useState("");
  const [saving, setSaving] = useState(false);
  const saveModalRef = useRef<HTMLDivElement>(null);

  const handleSavePrompt = async () => {
    if (!saveName.trim() || !state.promptTemplate.trim()) return;
    setSaving(true);
    try {
      const resp = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          promptTemplate: state.promptTemplate,
          variableGroups: state.variableGroups,
          model: state.model,
          tags: saveTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (resp.ok) {
        toast.success(t("savedSuccessfully"));
        setShowSaveModal(false);
        setSaveName("");
        setSaveTags("");
      } else {
        const data = (await resp.json().catch(() => ({ error: "Failed" }))) as {
          error?: string;
        };
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Close save modal on outside click
  useEffect(() => {
    if (!showSaveModal) return;
    const handler = (e: MouseEvent) => {
      if (saveModalRef.current && !saveModalRef.current.contains(e.target as Node)) {
        setShowSaveModal(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSaveModal]);

  const expand = useExpandVariables(state.promptTemplate, actions.setPromptTemplate);

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
        {/* Expand hint */}
        {expand.expandBlocks.length > 0 && (
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-muted-foreground/50">
              {expand.expandBlocks.length} {t("groups")} detected — AI can expand
            </span>
            <div className="flex items-center gap-1">
              {expand.hasExpanded && (
                <button
                  type="button"
                  onClick={expand.undoExpand}
                  disabled={expand.isExpanding}
                  className="flex h-7 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Undo"
                >
                  <Undo2Icon className="size-3" />
                  Undo
                </button>
              )}
              <button
                type="button"
                onClick={expand.doExpand}
                disabled={expand.isExpanding || expand.expandBlocks.length === 0}
                className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg bg-muted/50 px-3 text-xs font-medium text-foreground transition-all hover:bg-muted disabled:opacity-40"
              >
                {expand.isExpanding ? (
                  <>
                    <Loader2Icon className="size-3 animate-spin" />
                    {t("expanding")}
                  </>
                ) : (
                  <>
                    <WandSparklesIcon className="size-3" />
                    {t("expandAi")}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        {expand.expandBlocks.length === 0 && state.promptTemplate && (
          <div className="mt-1 text-xs text-muted-foreground/40">{t("promptHint")}</div>
        )}
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
            onClick={() => actions.setPromptTemplate(getRandomPrompt())}
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
          <button
            type="button"
            onClick={() => {
              setSaveName("");
              setSaveTags("");
              setShowSaveModal(true);
            }}
            disabled={!state.promptTemplate.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/30 transition-colors hover:bg-muted disabled:opacity-30"
            title={t("savePrompt")}
          >
            <SaveIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <button
          onClick={actions.startGenerating}
          disabled={comboCount === 0 || comboCount > 500 || state.isGenerating}
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

        <span
          className={`whitespace-nowrap ${
            comboCount > 500
              ? "font-medium text-red-500"
              : comboCount > 100
                ? "text-yellow-600"
                : "text-muted-foreground"
          }`}
        >
          {hasGroups && `${state.variableGroups.length} ${t("groups")} · `}
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

      {/* Save Prompt Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div
            ref={saveModalRef}
            className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px]"
          >
            <h3 className="mb-4 text-lg font-semibold">{t("savePrompt")}</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("promptName")}
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0071e3]"
                  placeholder={t("promptName")}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePrompt();
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Tags (optional)
                </label>
                <input
                  type="text"
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0071e3]"
                  placeholder="e.g. portrait, landscape"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePrompt();
                  }}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSavePrompt}
                  disabled={saving || !saveName.trim()}
                  className="flex-1 rounded-lg bg-[#0071e3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0077ed] disabled:opacity-50"
                >
                  {saving ? "Saving..." : t("savePrompt")}
                </button>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
