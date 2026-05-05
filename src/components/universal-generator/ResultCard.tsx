import { ImageIcon, AlertCircleIcon, Loader2Icon } from "lucide-react";

import type { GeneratedResult } from "./types";

interface ResultCardProps {
  result: GeneratedResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const { combination } = result;

  return (
    <div className="overflow-hidden rounded-[8px] border bg-card shadow-sm">
      <div className="relative flex aspect-square items-center justify-center bg-muted">
        {result.imageUrl ? (
          <>
            <img
              src={result.imageUrl}
              alt={combination.prompt}
              className="h-full w-full object-cover"
            />
            {result.watermark && (
              <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07]">
                  <span className="rotate-[-30deg] text-[10px] font-semibold whitespace-nowrap text-white">
                    batchlyai.com
                  </span>
                </div>
                <span className="absolute bottom-2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur-sm">
                  Upgrade to remove watermark
                </span>
              </div>
            )}
          </>
        ) : result.textContent ? (
          <p className="line-clamp-6 px-4 text-center text-sm leading-relaxed text-foreground/80">
            {result.textContent}
          </p>
        ) : result.status === "error" ? (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
            <AlertCircleIcon className="size-8" />
            <span className="text-xs">Failed</span>
          </div>
        ) : result.status === "generating" ? (
          <Loader2Icon className="size-8 animate-spin text-muted-foreground/40" />
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
