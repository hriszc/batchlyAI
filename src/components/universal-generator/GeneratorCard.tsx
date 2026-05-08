import {
  WandSparklesIcon,
  PaperclipIcon,
  Loader2Icon,
  Undo2Icon,
  ShoppingCartIcon,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import { GeneratorToolbar } from "./GeneratorToolbar";
import { getRandomPrompt } from "./inspire-prompts";
import { MODELS } from "./models";
import type { GeneratorState, GroupId, TextLength, VideoDuration } from "./types";
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
    setTextLength: (value: TextLength) => void;
    setVideoDuration: (value: VideoDuration) => void;
    startGenerating: () => void;
    setError: (value: string | null) => void;
    uploadFile: (file: File) => void;
    removeAttachment: (id: string) => void;
  };
  onRequireAuth?: (action: () => void) => void;
}

export function GeneratorCard({ state, actions, onRequireAuth }: GeneratorCardProps) {
  const [showVariables, setShowVariables] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const expand = useExpandVariables(state.promptTemplate, actions.setPromptTemplate);

  const handleBuyCredits = useCallback(async () => {
    setBuyLoading(true);
    try {
      const resp = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "usd", quantity: 1 }),
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
      setBuyLoading(false);
    }
  }, [t]);

  const combinations = computePromptCombinations(state.promptTemplate, state.variableGroups);
  const comboCount = combinations.length;
  const currentModel = MODELS.find((m) => m.id === state.model);
  const creditEstimate = comboCount * state.quantity * (currentModel?.creditCost ?? 0);
  const hasGroups = state.variableGroups.length > 0;

  // Auto-expand variable editor on first use
  const VARIABLE_EDITOR_SHOWN_KEY = "batchlyai_variable_editor_shown";
  useEffect(() => {
    if (hasGroups && !showVariables) {
      try {
        if (!localStorage.getItem(VARIABLE_EDITOR_SHOWN_KEY)) {
          setShowVariables(true);
          localStorage.setItem(VARIABLE_EDITOR_SHOWN_KEY, "1");
        }
      } catch {}
    }
  }, [hasGroups]);

  const disabledReason = state.isGenerating
    ? undefined
    : comboCount === 0
      ? t("disabledNoCombinations")
      : comboCount > 500
        ? t("disabledTooManyCombinations", { count: String(comboCount) })
        : undefined;

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
                onClick={() => (onRequireAuth ? onRequireAuth(expand.doExpand) : expand.doExpand())}
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
        {!state.promptTemplate && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground/50">{t("tryExample")}</span>
            {(["examplePrompt1", "examplePrompt2", "examplePrompt3"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => actions.setPromptTemplate(t(key))}
                className="inline-flex items-center rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t(key)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error banner */}
      {state.error && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <span className="flex-1">{state.error}</span>
            {state.error.includes("Insufficient credits") && (
              <button
                type="button"
                onClick={handleBuyCredits}
                disabled={buyLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-accent-blue-hover disabled:opacity-50"
              >
                {buyLoading ? (
                  <Loader2Icon className="size-3 animate-spin" />
                ) : (
                  <ShoppingCartIcon className="size-3" />
                )}
                {t("buyCreditsCTA")}
              </button>
            )}
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
        </div>

        <button
          onClick={() =>
            onRequireAuth ? onRequireAuth(actions.startGenerating) : actions.startGenerating()
          }
          disabled={comboCount === 0 || comboCount > 500 || state.isGenerating}
          title={disabledReason}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[980px] bg-accent-blue px-5 py-2 text-[17px] leading-[1.0] font-normal whitespace-nowrap text-white transition-all hover:bg-accent-blue-hover focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        >
          {state.isGenerating ? t("generating") : t("generate")}
        </button>
      </div>

      {/* Bottom toolbar */}
      <GeneratorToolbar
        showVariables={showVariables}
        onToggleVariables={() => setShowVariables(!showVariables)}
        currentModel={state.model}
        onSelectModel={actions.setModel}
        aspectRatio={state.aspectRatio}
        onSetAspectRatio={actions.setAspectRatio}
        quantity={state.quantity}
        onSetQuantity={actions.setQuantity}
        textLength={state.textLength}
        onSetTextLength={actions.setTextLength}
        videoDuration={state.videoDuration}
        onSetVideoDuration={actions.setVideoDuration}
        comboCount={comboCount}
        groupCount={state.variableGroups.length}
        hasGroups={hasGroups}
        creditEstimate={creditEstimate}
        creditsRemaining={state.creditsRemaining}
      />

      {/* Collapsible variable groups editor */}
      {showVariables && hasGroups && (
        <div className="space-y-3 border-t bg-muted/10 px-4 py-3">
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
