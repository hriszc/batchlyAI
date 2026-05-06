import type { PromptCombination, GeneratedResult } from "./types";

function generateResultId(): string {
  return `result_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface PollResult {
  id: string;
  status: string;
  urls: string[] | null;
  error: string | null;
}

interface AsyncPending {
  predictionIds: string[];
  modelType: string;
  combination: PromptCombination;
}

export async function unifiedPoll(pendings: AsyncPending[]): Promise<GeneratedResult[]> {
  const maxAttempts = 60;
  const interval = 2000;

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

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, interval));

    try {
      const resp = await fetch(
        `/api/generate-status?ids=${[...pendingIds].join(",")}&type=${modelType}`,
      );
      const json = (await resp.json()) as { results?: PollResult[]; error?: string };

      if (!json.results) continue;

      const finished: GeneratedResult[] = [];

      for (const r of json.results) {
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
  }

  // Timeout: remaining pending IDs become error results
  const timedOut: GeneratedResult[] = [];
  for (const id of pendingIds) {
    const combination = idToCombo.get(id) ?? pendings[0].combination;
    timedOut.push({
      id: generateResultId(),
      combination,
      imageUrl: null,
      textContent: null,
      watermark: false,
      status: "error" as const,
    });
  }
  return timedOut;
}
