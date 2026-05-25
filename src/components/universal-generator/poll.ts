import type { PromptCombination, GeneratedResult } from "./types";

function generateResultId(): string {
  return `result_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface PollResult {
  id: string;
  status: string;
  urls: string[] | null;
  error: string | null;
  creditsRemaining?: number;
}

interface AsyncPending {
  predictionIds: string[];
  modelType: string;
  combination: PromptCombination;
  mediaType?: "image" | "video";
  guestToken?: string;
}

export interface PollProgress {
  elapsed: number;
  estimated: number;
  remaining: number;
}

export async function unifiedPoll(
  pendings: AsyncPending[],
  estimatedMs?: number,
  onProgress?: (progress: PollProgress) => void,
  pollIntervalMs = 2000,
  onCreditsRemaining?: (creditsRemaining: number) => void,
  onResults?: (results: GeneratedResult[]) => void,
  onError?: (error: string) => void,
): Promise<GeneratedResult[]> {
  const idToCombo = new Map<string, PromptCombination>();
  const idToMediaType = new Map<string, "image" | "video">();
  const allIds: string[] = [];
  for (const p of pendings) {
    for (const id of p.predictionIds) {
      idToCombo.set(id, p.combination);
      idToMediaType.set(id, p.mediaType ?? "image");
      allIds.push(id);
    }
  }

  const modelType = pendings[0]?.modelType ?? "replicate";
  const pendingIds = new Set(allIds);
  const finished: GeneratedResult[] = [];

  // Default estimates: image ~90s, video ~300s
  const estimated = estimatedMs ?? 90_000;
  const maxAttempts = Math.max(1, Math.ceil((estimated * 1.2) / pollIntervalMs));
  const startTime = Date.now();
  const headers = (() => {
    const guestToken = pendings.find((p) => p.guestToken)?.guestToken;
    return guestToken ? { "x-guest-token": guestToken } : undefined;
  })();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    try {
      const resp = await fetch(
        `/api/generate-status?ids=${[...pendingIds].join(",")}&type=${modelType}`,
        { headers },
      );
      const json = (await resp.json()) as { results?: PollResult[]; error?: string };

      if (!json.results) continue;

      const newResults: GeneratedResult[] = [];
      for (const r of json.results) {
        if (r.creditsRemaining != null) {
          onCreditsRemaining?.(r.creditsRemaining);
        }
        if (
          r.status === "succeeded" ||
          r.status === "failed" ||
          r.status === "canceled" ||
          r.status === "error"
        ) {
          const combination = idToCombo.get(r.id) ?? pendings[0].combination;
          const mediaType = idToMediaType.get(r.id) ?? "image";
          if (r.status === "succeeded" && r.urls) {
            for (const url of r.urls) {
              newResults.push({
                id: generateResultId(),
                combination,
                imageUrl: url,
                textContent: null,
                mediaType,
                watermark: false,
                status: "complete" as const,
              });
            }
          } else {
            if (r.error) onError?.(r.error);
            newResults.push({
              id: generateResultId(),
              combination,
              imageUrl: null,
              textContent: null,
              mediaType,
              errorMessage: r.error,
              watermark: false,
              status: "error" as const,
            });
          }
          pendingIds.delete(r.id);
        }
      }
      if (newResults.length > 0) {
        finished.push(...newResults);
        onResults?.(newResults);
      }

      if (pendingIds.size === 0) return finished;
    } catch {
      // Keep polling on transient errors
    }

    // Report progress
    const elapsed = Date.now() - startTime;
    onProgress?.({ elapsed, estimated, remaining: pendingIds.size });
  }

  try {
    const resp = await fetch(
      `/api/generate-status?ids=${[...pendingIds].join(",")}&type=${modelType}&timeout=1`,
      { headers },
    );
    const json = (await resp.json()) as { results?: PollResult[]; error?: string };
    if (json.results) {
      const newResults: GeneratedResult[] = [];
      for (const r of json.results) {
        if (r.creditsRemaining != null) {
          onCreditsRemaining?.(r.creditsRemaining);
        }
        if (
          r.status === "succeeded" ||
          r.status === "failed" ||
          r.status === "canceled" ||
          r.status === "error"
        ) {
          const combination = idToCombo.get(r.id) ?? pendings[0].combination;
          const mediaType = idToMediaType.get(r.id) ?? "image";
          if (r.status === "succeeded" && r.urls) {
            for (const url of r.urls) {
              newResults.push({
                id: generateResultId(),
                combination,
                imageUrl: url,
                textContent: null,
                mediaType,
                watermark: false,
                status: "complete" as const,
              });
            }
          } else {
            if (r.error) onError?.(r.error);
            newResults.push({
              id: generateResultId(),
              combination,
              imageUrl: null,
              textContent: null,
              mediaType,
              errorMessage: r.error,
              watermark: false,
              status: "error" as const,
            });
          }
          pendingIds.delete(r.id);
        }
      }
      if (newResults.length > 0) {
        finished.push(...newResults);
        onResults?.(newResults);
      }
    }
  } catch {
    // If timeout confirmation fails, still surface the pending items as local errors.
  }

  // Timeout: remaining pending IDs become error results
  for (const id of pendingIds) {
    const combination = idToCombo.get(id) ?? pendings[0].combination;
    const mediaType = idToMediaType.get(id) ?? "image";
    finished.push({
      id: generateResultId(),
      combination,
      imageUrl: null,
      textContent: null,
      mediaType,
      watermark: false,
      status: "error" as const,
    });
  }
  return finished;
}
