import { XIcon, PlusIcon } from "lucide-react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import type { VariableGroup } from "./types";

interface VariableGroupCardProps {
  group: VariableGroup;
  index: number;
  onAddValue: () => void;
  onUpdateValue: (index: number, value: string) => void;
  onRemoveValue: (index: number) => void;
}

export function VariableGroupCard({
  group,
  index,
  onAddValue,
  onUpdateValue,
  onRemoveValue,
}: VariableGroupCardProps) {
  const { t } = useLanguage();

  const handleValueKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddValue();
    }
  };

  const filledCount = group.values.filter((v) => v.trim()).length;

  return (
    <div className="rounded-[8px] border bg-background p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {t("groupLabel", { index: index + 1 })}
        </span>
        <span className="text-xs text-muted-foreground/60">
          {filledCount > 0 ? t("valuesCount", { count: filledCount }) : t("noValues")}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        {group.values.map((value, i) => (
          <div
            key={i}
            className="group/item inline-flex items-center gap-1.5 rounded-[8px] bg-muted px-3 py-1.5 text-sm text-foreground"
          >
            <input
              type="text"
              value={value}
              onChange={(e) => onUpdateValue(i, e.target.value)}
              onKeyDown={handleValueKeyDown}
              placeholder={t("valuePlaceholder")}
              className="max-w-[140px] min-w-[60px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
            />
            <button
              onClick={() => onRemoveValue(i)}
              className="text-muted-foreground opacity-0 transition-all group-hover/item:opacity-100 hover:text-foreground"
              aria-label="删除值"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ))}
        {filledCount === 0 && (
          <span className="py-1.5 text-sm text-muted-foreground/40">{t("noValues")}</span>
        )}
      </div>

      <button
        onClick={onAddValue}
        className="inline-flex items-center gap-1 text-sm text-[#0066cc] hover:underline"
      >
        <PlusIcon className="size-3.5" />
        {t("addValue")}
      </button>
    </div>
  );
}
