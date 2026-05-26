import { useQueryClient } from "@tanstack/react-query";
import { useReducer, useCallback, useRef, useEffect } from "react";

import { authClient } from "@/lib/auth/auth-client";
import { CONTENT_SAFETY_BLOCK_MESSAGE } from "@/lib/content-safety";
import { applyCreditsToClientCaches, CREDIT_UPDATED_EVENT } from "@/lib/credits/client-sync";
import { calculateGenerationCredits } from "@/lib/generator-credits";
import { useLanguage } from "@/lib/i18n/LanguageContext";

import { MODELS } from "./models";
import { unifiedPoll } from "./poll";
import { reducer, initialState } from "./reducer";
import type {
  GeneratedResult,
  GroupId,
  PromptCombination,
  TextLength,
  VideoDuration,
} from "./types";
import { TEXT_LENGTH_TOKENS, VIDEO_DURATION_SECONDS } from "./types";
import { computePromptCombinations } from "./utils";

function generateResultId(): string {
  return `result_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 30_000;
const IMAGE_ESTIMATE_MS_PER_RESULT = 60_000;
const VIDEO_ESTIMATE_MS_PER_RESULT = 300_000;
const IMAGE_POLL_INTERVAL_MS = 5_000;
const VIDEO_POLL_INTERVAL_MS = 10_000;
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".bmp",
  ".tiff",
]);
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
]);

function getSessionCredits(session: unknown): number | null {
  if (!session || typeof session !== "object" || !("user" in session)) return null;
  const user = (session as { user?: unknown }).user;
  if (!user || typeof user !== "object" || !("credits" in user)) return null;
  const credits = (user as { credits?: unknown }).credits;
  return typeof credits === "number" ? credits : null;
}

function getFileExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

interface AsyncPending {
  predictionIds: string[];
  modelType: string;
  combination: PromptCombination;
  mediaType: "image" | "video";
  guestToken?: string;
}

export function useGeneratorState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  const guestTokenRef = useRef<string | null>(null);
  const generationInFlightRef = useRef(false);
  const { t } = useLanguage();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const isLoggedIn = !!session?.user?.id;
  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    const credits = getSessionCredits(session);
    if (credits != null) {
      dispatch({ type: "SET_CREDITS_REMAINING", payload: credits });
    }
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleCreditUpdate = (event: Event) => {
      const credits = (event as CustomEvent<{ credits?: unknown }>).detail?.credits;
      if (typeof credits === "number") {
        dispatch({ type: "SET_CREDITS_REMAINING", payload: credits });
      }
    };

    window.addEventListener(CREDIT_UPDATED_EVENT, handleCreditUpdate);
    return () => {
      window.removeEventListener(CREDIT_UPDATED_EVENT, handleCreditUpdate);
    };
  }, []);

  const getGuestToken = useCallback(() => {
    if (isLoggedIn) return null;
    if (guestTokenRef.current) return guestTokenRef.current;
    try {
      const existing = localStorage.getItem("batchlyai_guest_token");
      if (existing) {
        guestTokenRef.current = existing;
        return existing;
      }
      const token =
        globalThis.crypto?.randomUUID?.() ||
        `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("batchlyai_guest_token", token);
      guestTokenRef.current = token;
      return token;
    } catch {
      const token =
        globalThis.crypto?.randomUUID?.() ||
        `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      guestTokenRef.current = token;
      return token;
    }
  }, [isLoggedIn]);

  const setPromptTemplate = useCallback((value: string) => {
    dispatch({ type: "SET_PROMPT_TEMPLATE", payload: value });
    dispatch({ type: "SET_ERROR", payload: null });
  }, []);

  const setExpandedPromptTemplate = useCallback((value: string, originalPromptTemplate: string) => {
    dispatch({
      type: "SET_EXPANDED_PROMPT_TEMPLATE",
      payload: { promptTemplate: value, originalPromptTemplate },
    });
    dispatch({ type: "SET_ERROR", payload: null });
  }, []);

  const setQuantity = useCallback((value: number) => {
    dispatch({ type: "SET_QUANTITY", payload: value });
  }, []);

  const setAspectRatio = useCallback((value: string) => {
    dispatch({ type: "SET_ASPECT_RATIO", payload: value });
  }, []);

  const setModel = useCallback((value: string) => {
    dispatch({ type: "SET_MODEL", payload: value });
  }, []);

  const setTextLength = useCallback((value: TextLength) => {
    dispatch({ type: "SET_TEXT_LENGTH", payload: value });
  }, []);

  const setVideoDuration = useCallback((value: VideoDuration) => {
    dispatch({ type: "SET_VIDEO_DURATION", payload: value });
  }, []);

  const addValue = useCallback((groupId: GroupId) => {
    dispatch({ type: "ADD_VALUE", payload: { groupId } });
  }, []);

  const updateValue = useCallback((groupId: GroupId, index: number, value: string) => {
    dispatch({ type: "UPDATE_VALUE", payload: { groupId, index, value } });
  }, []);

  const removeValue = useCallback((groupId: GroupId, index: number) => {
    dispatch({ type: "REMOVE_VALUE", payload: { groupId, index } });
  }, []);

  const syncCreditsRemaining = useCallback(
    (creditsRemaining: number) => {
      dispatch({ type: "SET_CREDITS_REMAINING", payload: creditsRemaining });
      applyCreditsToClientCaches(creditsRemaining, queryClient);
    },
    [queryClient],
  );

  const startGenerating = useCallback(() => {
    if (generationInFlightRef.current) return;
    generationInFlightRef.current = true;

    const currentState = stateRef.current;
    dispatch({ type: "START_GENERATING" });
    dispatch({ type: "SET_PROGRESS", payload: null });

    const combinations = computePromptCombinations(
      currentState.promptTemplate,
      currentState.variableGroups,
    );

    if (combinations.length > 500) {
      dispatch({
        type: "SET_ERROR",
        payload: t("tooManyCombinationsDetailed"),
      });
      generationInFlightRef.current = false;
      return;
    }

    const model = MODELS.find((m) => m.id === currentState.model);
    const isTextModel = model?.category === "text";
    const isVideoModel = model?.category === "video";
    const guestToken = isLoggedIn ? null : getGuestToken();
    const unitsPerCombination = isTextModel || isVideoModel ? 1 : currentState.quantity;
    const optimisticCost = calculateGenerationCredits({
      model: currentState.model,
      quantity: combinations.length * unitsPerCombination,
      durationSeconds: currentState.model.startsWith("z-video")
        ? VIDEO_DURATION_SECONDS[currentState.videoDuration]
        : undefined,
    });
    const startingCredits = currentState.creditsRemaining ?? getSessionCredits(session);
    const optimisticStartingCredits = isLoggedIn ? startingCredits : null;

    if (optimisticStartingCredits != null && optimisticCost > 0) {
      syncCreditsRemaining(Math.max(0, optimisticStartingCredits - optimisticCost));
    }

    if (!isTextModel) {
      let globalError: string | null = null;
      let creditsRemaining: number | null = null;
      let isWatermarked = false;
      const asyncPendings: AsyncPending[] = [];
      const outputMediaType: "image" | "video" = isVideoModel ? "video" : "image";
      const mapBackendError = (message: string) =>
        message === CONTENT_SAFETY_BLOCK_MESSAGE ? t("contentSafetyBlocked") : message;

      void Promise.all(
        combinations.map(async (combination) => {
          try {
            const resp = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: combination.prompt,
                promptTemplate: currentState.promptTemplate,
                variableGroups: currentState.variableGroups,
                aspectRatio: currentState.aspectRatio,
                n: isVideoModel ? 1 : currentState.quantity,
                model: currentState.model,
                ...(guestToken ? { guestToken } : {}),
                attachedUrls: currentState.attachedFiles.filter((f) => f.url).map((f) => f.url!),
                ...(isVideoModel
                  ? { duration: VIDEO_DURATION_SECONDS[currentState.videoDuration] }
                  : {}),
              }),
            });
            const json = (await resp.json()) as {
              urls?: string[];
              predictionIds?: string[];
              async?: boolean;
              modelType?: string;
              error?: string;
              required?: number;
              available?: number;
              creditsRemaining?: number;
              watermark?: boolean;
            };

            if (json.creditsRemaining != null) {
              creditsRemaining = json.creditsRemaining;
            }

            if (resp.status === 401) {
              globalError = t("loginRequiredToGenerate");
              return [];
            }

            if (resp.status === 402) {
              globalError = t("insufficientCreditsDetailed", {
                required: json.required ?? 0,
                available: json.available ?? 0,
              });
              creditsRemaining = json.available ?? null;
              return [];
            }

            if (!resp.ok || json.error) {
              if (json.error) {
                globalError = mapBackendError(json.error);
              }
              return {
                id: generateResultId(),
                combination,
                imageUrl: null,
                textContent: null,
                mediaType: outputMediaType,
                errorMessage: json.error ? mapBackendError(json.error) : null,
                watermark: false,
                status: "error" as const,
              };
            }

            if (json.watermark) {
              isWatermarked = true;
            }

            // Sync response (cached)
            if (json.urls) {
              return json.urls.map((url) => ({
                id: generateResultId(),
                combination,
                imageUrl: url,
                textContent: null,
                mediaType: outputMediaType,
                watermark: false,
                status: "complete" as const,
              }));
            }

            // Async response — defer to unified poll later
            if (json.predictionIds?.length && json.async) {
              const modelType = json.modelType || "replicate";
              asyncPendings.push({
                predictionIds: json.predictionIds,
                modelType,
                combination,
                mediaType: outputMediaType,
                guestToken: guestToken ?? undefined,
              });
              return [];
            }

            return [];
          } catch {
            return [
              {
                id: generateResultId(),
                combination,
                imageUrl: null,
                textContent: null,
                mediaType: outputMediaType,
                watermark: false,
                status: "error" as const,
              },
            ];
          }
        }),
      )
        .then(async (resultGroups) => {
          let results: GeneratedResult[] = resultGroups.flat();

          // Unified polling: merge all prediction IDs into a single poll loop
          if (asyncPendings.length > 0) {
            const isVideo = model?.category === "video";
            const asyncResultCount = asyncPendings.reduce(
              (sum, pending) => sum + pending.predictionIds.length,
              0,
            );
            const estimatedMs = Math.max(
              isVideo ? VIDEO_ESTIMATE_MS_PER_RESULT : IMAGE_ESTIMATE_MS_PER_RESULT,
              asyncResultCount *
                (isVideo ? VIDEO_ESTIMATE_MS_PER_RESULT : IMAGE_ESTIMATE_MS_PER_RESULT),
            );
            const pollIntervalMs = isVideo ? VIDEO_POLL_INTERVAL_MS : IMAGE_POLL_INTERVAL_MS;
            const normalizeResultErrors = (items: GeneratedResult[]): GeneratedResult[] =>
              items.map((result) =>
                result.errorMessage
                  ? { ...result, errorMessage: mapBackendError(result.errorMessage) }
                  : result,
              );
            dispatch({
              type: "SET_PROGRESS",
              payload: { elapsed: 0, estimated: estimatedMs, remaining: asyncResultCount },
            });
            const polled = (await unifiedPoll(
              asyncPendings,
              estimatedMs,
              (p) => {
                dispatch({ type: "SET_PROGRESS", payload: p });
              },
              pollIntervalMs,
              syncCreditsRemaining,
              (partialResults) => {
                const normalizedResults = normalizeResultErrors(partialResults);
                dispatch({
                  type: "APPEND_RESULTS",
                  payload: isWatermarked
                    ? normalizedResults.map((result) => ({ ...result, watermark: true }))
                    : normalizedResults,
                });
              },
              (message) => {
                globalError = mapBackendError(message);
              },
            )) as typeof results;
            results = [...results, ...normalizeResultErrors(polled)];
          }

          if (isWatermarked) {
            results = results.map((r) => ({ ...r, watermark: true }));
          }
          dispatch({ type: "FINISH_GENERATING", payload: results });
          dispatch({ type: "SET_PROGRESS", payload: null });
          if (globalError) {
            dispatch({ type: "SET_ERROR", payload: globalError });
          }
          if (creditsRemaining != null) {
            syncCreditsRemaining(creditsRemaining);
          } else if (
            optimisticStartingCredits != null &&
            asyncPendings.length === 0 &&
            results.length > 0 &&
            results.every((result) => result.status === "error")
          ) {
            syncCreditsRemaining(optimisticStartingCredits);
          }
        })
        .catch((err) => {
          dispatch({ type: "SET_ERROR", payload: String(err) });
        })
        .finally(() => {
          generationInFlightRef.current = false;
        });
    } else {
      // Text generation via DeepSeek
      let textCreditsRemaining: number | null = null;
      void Promise.all(
        combinations.map(async (combination) => {
          try {
            const resp = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: combination.prompt,
                promptTemplate: currentState.promptTemplate,
                variableGroups: currentState.variableGroups,
                n: 1,
                model: currentState.model,
                maxTokens: TEXT_LENGTH_TOKENS[currentState.textLength],
                ...(guestToken ? { guestToken } : {}),
              }),
            });
            const json = (await resp.json()) as {
              texts?: string[];
              urls?: string[];
              error?: string;
              creditsRemaining?: number;
              watermark?: boolean;
            };

            const textWatermark = json.watermark ?? false;

            if (json.creditsRemaining != null) {
              textCreditsRemaining = json.creditsRemaining;
              syncCreditsRemaining(json.creditsRemaining);
            }

            if (!resp.ok || json.error) {
              if (json.error) {
                dispatch({ type: "SET_ERROR", payload: json.error });
              }
              return {
                id: generateResultId(),
                combination,
                imageUrl: null,
                textContent: null,
                mediaType: "text" as const,
                errorMessage: json.error,
                watermark: textWatermark,
                status: "error" as const,
              };
            }

            return (json.texts || json.urls || []).map((text) => ({
              id: generateResultId(),
              combination,
              imageUrl: null,
              textContent: json.texts ? text : null,
              mediaType: "text" as const,
              watermark: textWatermark,
              status: "complete" as const,
            }));
          } catch {
            return [
              {
                id: generateResultId(),
                combination,
                imageUrl: null,
                textContent: null,
                mediaType: "text" as const,
                watermark: false,
                status: "error" as const,
              },
            ];
          }
        }),
      )
        .then((resultGroups) => {
          const results = resultGroups.flat();
          if (
            textCreditsRemaining == null &&
            optimisticStartingCredits != null &&
            results.length > 0 &&
            results.every((result) => result.status === "error")
          ) {
            syncCreditsRemaining(optimisticStartingCredits);
          }
          dispatch({
            type: "FINISH_GENERATING",
            payload: results,
          });
        })
        .catch((err) => {
          dispatch({ type: "SET_ERROR", payload: String(err) });
        })
        .finally(() => {
          generationInFlightRef.current = false;
        });
    }
  }, [getGuestToken, isLoggedIn, session, syncCreditsRemaining, t]);

  const setError = useCallback((value: string | null) => {
    dispatch({ type: "SET_ERROR", payload: value });
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const extension = getFileExtension(file.name);
      if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
        dispatch({ type: "SET_ERROR", payload: t("uploadUnsupportedFile") });
        return;
      }
      if (file.type && !ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
        dispatch({ type: "SET_ERROR", payload: t("uploadUnsupportedFile") });
        return;
      }
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        dispatch({ type: "SET_ERROR", payload: t("uploadTooLarge") });
        return;
      }

      const id = `attach_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      dispatch({ type: "ADD_ATTACHMENT", payload: { id, name: file.name, uploading: true } });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

      try {
        const resp = await fetch("/api/upload-url", {
          method: "POST",
          body: file,
          signal: controller.signal,
          headers: {
            "X-File-Name": encodeURIComponent(file.name),
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (resp.status === 401) {
          dispatch({ type: "SET_ERROR", payload: t("loginRequiredToUpload") });
          dispatch({ type: "REMOVE_ATTACHMENT", payload: id });
          return;
        }

        if (!resp.ok) {
          const errBody = (await resp.json().catch(() => ({}))) as { error?: string };
          dispatch({ type: "SET_ERROR", payload: errBody.error || t("uploadFailed") });
          dispatch({ type: "REMOVE_ATTACHMENT", payload: id });
          return;
        }

        const { publicUrl, key } = (await resp.json()) as { publicUrl: string; key: string };
        dispatch({ type: "UPDATE_ATTACHMENT", payload: { id, url: publicUrl, key } });
      } catch (err) {
        const timedOut = err instanceof Error && err.name === "AbortError";
        dispatch({
          type: "SET_ERROR",
          payload: timedOut ? t("uploadTimedOut") : t("uploadFailed"),
        });
        dispatch({ type: "REMOVE_ATTACHMENT", payload: id });
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [t],
  );

  const removeAttachment = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ATTACHMENT", payload: id });
  }, []);

  return {
    state,
    actions: {
      setPromptTemplate,
      setExpandedPromptTemplate,
      setQuantity,
      setAspectRatio,
      setModel,
      addValue,
      updateValue,
      removeValue,
      setTextLength,
      setVideoDuration,
      startGenerating,
      setError,
      uploadFile,
      removeAttachment,
    },
  };
}
