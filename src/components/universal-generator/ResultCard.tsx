import { ImageIcon, AlertCircleIcon } from "lucide-react";

import type { GeneratedResult } from "./types";

interface ResultCardProps {
  result: GeneratedResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const { combination } = result;

  return (
    <div className="overflow-hidden rounded-[8px] border bg-card shadow-sm">
      <div className="flex aspect-square items-center justify-center bg-muted">
        {result.imageUrl ? (
          <img
            src={result.imageUrl}
            alt={combination.prompt}
            className="h-full w-full object-cover"
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
      <p className="line-clamp-2 px-4 pt-4 text-sm leading-[1.29] text-foreground/80">
        {combination.prompt}
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-4 pt-2 pb-4 text-xs leading-[1.33] text-muted-foreground">
        {Object.entries(combination.variables).map(([key, val]) => (
          <span key={key}>
            {key}: {val}
          </span>
        ))}
      </div>
    </div>
  );
}
