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
): Promise<GeneratedResult[]> {
  const maxAttempts = 60;

  const idToCombo = new Map<string, PromptCombination>();
  const allIds: string[] = [];
  for (const p of pendings) {
    for (const id of p.predictionIds) {
      idToCombo.set(id, p.combination);
      allIds.push(id);
    }
  }

  const modelType = pendings[0]?.modelType ?? "replicate";
  const pendingIds = new Set(allIds);
  const finished: GeneratedResult[] = [];

  // Default estimates: image ~90s, video ~300s
  const estimated = estimatedMs ?? 90_000;
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
          if (r.status === "succeeded" && r.urls) {
            for (const url of r.urls) {
              finished.push({
                id: generateResultId(),
                combination,
                imageUrl: url,
                textContent: null,
                watermark: false,
                status: "complete" as const,
              });
            }
          } else {
            finished.push({
              id: generateResultId(),
              combination,
              imageUrl: null,
              textContent: null,
              watermark: false,
              status: "error" as const,
            });
          }
          pendingIds.delete(r.id);
        }
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
          if (r.status === "succeeded" && r.urls) {
            for (const url of r.urls) {
              finished.push({
                id: generateResultId(),
                combination,
                imageUrl: url,
                textContent: null,
                watermark: false,
                status: "complete" as const,
              });
            }
          } else {
            finished.push({
              id: generateResultId(),
              combination,
              imageUrl: null,
              textContent: null,
              watermark: false,
              status: "error" as const,
            });
          }
          pendingIds.delete(r.id);
        }
      }
    }
  } catch {
    // If timeout confirmation fails, still surface the pending items as local errors.
  }

  // Timeout: remaining pending IDs become error results
  for (const id of pendingIds) {
    const combination = idToCombo.get(id) ?? pendings[0].combination;
    finished.push({
      id: generateResultId(),
      combination,
      imageUrl: null,
      textContent: null,
      watermark: false,
      status: "error" as const,
    });
  }
  return finished;
}
