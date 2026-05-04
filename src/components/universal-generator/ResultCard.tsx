import { ImageIcon, AlertCircleIcon } from "lucide-react";
import type { GeneratedResult } from "./types";

interface ResultCardProps {
  result: GeneratedResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const { combination } = result;

  return (
    <div className="bg-card rounded-[8px] overflow-hidden border shadow-sm">
      <div className="aspect-square bg-muted flex items-center justify-center">
        {result.imageUrl ? (
          <img
            src={result.imageUrl}
            alt={combination.prompt}
            className="w-full h-full object-cover"
          />
        ) : result.status === "error" ? (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
            <AlertCircleIcon className="size-8" />
            <span className="text-xs">Failed</span>
          </div>
        ) : (
          <ImageIcon className="size-8 text-muted-foreground/30" />
        )}
      </div>
      <p className="text-foreground/80 text-sm leading-[1.29] px-4 pt-4 line-clamp-2">
        {combination.prompt}
      </p>
      <div className="text-muted-foreground text-xs leading-[1.33] px-4 pt-2 pb-4 flex flex-wrap gap-x-3 gap-y-0.5">
        {Object.entries(combination.variables).map(([key, val]) => (
          <span key={key}>
            {key}: {val}
          </span>
        ))}
      </div>
    </div>
  );
}
