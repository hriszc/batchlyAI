import { XIcon, PlusIcon } from "lucide-react";
import type { VariableGroup } from "./types";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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
    <div className="bg-background rounded-[8px] p-3 border">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {t("groupLabel", { index: index + 1 })}
        </span>
        <span className="text-xs text-muted-foreground/60">
          {filledCount > 0
            ? t("valuesCount", { count: filledCount })
            : t("noValues")}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {group.values.map((value, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-1.5 bg-muted text-foreground text-sm rounded-[8px] px-3 py-1.5 group/item"
          >
            <input
              type="text"
              value={value}
              onChange={(e) => onUpdateValue(i, e.target.value)}
              onKeyDown={handleValueKeyDown}
              placeholder={t("valuePlaceholder")}
              className="bg-transparent outline-none min-w-[60px] max-w-[140px] text-sm placeholder:text-muted-foreground/40"
            />
            <button
              onClick={() => onRemoveValue(i)}
              className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-foreground transition-all"
              aria-label="删除值"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ))}
        {filledCount === 0 && (
          <span className="text-muted-foreground/40 text-sm py-1.5">
            {t("noValues")}
          </span>
        )}
      </div>

      <button
        onClick={onAddValue}
        className="text-[#0066cc] text-sm hover:underline inline-flex items-center gap-1"
      >
        <PlusIcon className="size-3.5" />
        {t("addValue")}
      </button>
    </div>
  );
}
