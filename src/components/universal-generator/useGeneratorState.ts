import { useReducer, useCallback, useRef, useEffect } from "react";

import { authClient } from "@/lib/auth/auth-client";

import { MODELS } from "./models";
import { unifiedPoll } from "./poll";
import { reducer, initialState } from "./reducer";
import type { GroupId, PromptCombination, TextLength, VideoDuration } from "./types";
import { TEXT_LENGTH_TOKENS, VIDEO_DURATION_SECONDS } from "./types";
import { computePromptCombinations } from "./utils";

function generateResultId(): string {
  return `result_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface AsyncPending {
  predictionIds: string[];
  modelType: string;
  combination: PromptCombination;
  guestToken?: string;
}

export function useGeneratorState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  const guestTokenRef = useRef<string | null>(null);
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session?.user?.id;
  useEffect(() => {
    stateRef.current = state;
  });

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

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch({ type: "SYNC_GROUPS_FROM_TEMPLATE" });
    }, 500);
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

  const startGenerating = useCallback(() => {
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
        payload: "Too many combinations (max 500). Remove some variable values.",
      });
      return;
    }

    const model = MODELS.find((m) => m.id === currentState.model);
    const isTextModel = model?.category === "text";
    const guestToken = isLoggedIn ? null : getGuestToken();

    if (!isTextModel) {
      let globalError: string | null = null;
      let creditsRemaining: number | null = null;
      let isWatermarked = false;
      const asyncPendings: AsyncPending[] = [];

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
                n: currentState.quantity,
                model: currentState.model,
                ...(guestToken ? { guestToken } : {}),
                attachedUrls: currentState.attachedFiles.filter((f) => f.url).map((f) => f.url!),
                ...(model?.category === "video"
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

            if (resp.status === 401) {
              globalError = "Please login to generate";
              return [];
            }

            if (resp.status === 402) {
              globalError = `Insufficient credits: need ${json.required}, have ${json.available}`;
              creditsRemaining = json.available ?? null;
              return [];
            }

            if (!resp.ok || json.error) {
              return {
                id: generateResultId(),
                combination,
                imageUrl: null,
                textContent: null,
                watermark: false,
                status: "error" as const,
              };
            }

            if (json.creditsRemaining != null) {
              creditsRemaining = json.creditsRemaining;
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
                watermark: false,
                status: "error" as const,
              },
            ];
          }
        }),
      )
        .then(async (resultGroups) => {
          let results = resultGroups.flat();

          // Unified polling: merge all prediction IDs into a single poll loop
          if (asyncPendings.length > 0) {
            const isVideo = model?.category === "video";
            const estimatedMs = isVideo ? 300_000 : 90_000;
            const polled = (await unifiedPoll(asyncPendings, estimatedMs, (p) => {
              dispatch({ type: "SET_PROGRESS", payload: p });
            })) as typeof results;
            results = [...results, ...polled];
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
            dispatch({ type: "SET_CREDITS_REMAINING", payload: creditsRemaining });
            // Refresh the session so SettingsBar shows updated credits
            authClient.$fetch("/get-session").catch(() => {});
          }
        })
        .catch((err) => {
          dispatch({ type: "SET_ERROR", payload: String(err) });
        });
    } else {
      // Text generation via DeepSeek
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

            if (!resp.ok || json.error) {
              return {
                id: generateResultId(),
                combination,
                imageUrl: null,
                textContent: null,
                watermark: textWatermark,
                status: "error" as const,
              };
            }

            if (json.creditsRemaining != null) {
              dispatch({ type: "SET_CREDITS_REMAINING", payload: json.creditsRemaining });
              authClient.$fetch("/get-session").catch(() => {});
            }

            return (json.texts || json.urls || []).map((text) => ({
              id: generateResultId(),
              combination,
              imageUrl: null,
              textContent: json.texts ? text : null,
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
                watermark: false,
                status: "error" as const,
              },
            ];
          }
        }),
      )
        .then((resultGroups) => {
          dispatch({
            type: "FINISH_GENERATING",
            payload: resultGroups.flat(),
          });
        })
        .catch((err) => {
          dispatch({ type: "SET_ERROR", payload: String(err) });
        });
    }
  }, [getGuestToken, isLoggedIn]);

  const setError = useCallback((value: string | null) => {
    dispatch({ type: "SET_ERROR", payload: value });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const id = `attach_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    dispatch({ type: "ADD_ATTACHMENT", payload: { id, name: file.name, uploading: true } });

    try {
      const resp = await fetch("/api/upload-url", {
        method: "POST",
        body: file,
        headers: {
          "X-File-Name": encodeURIComponent(file.name),
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (resp.status === 401) {
        dispatch({ type: "SET_ERROR", payload: "Please login to upload files" });
        dispatch({ type: "REMOVE_ATTACHMENT", payload: id });
        return;
      }

      if (!resp.ok) {
        const errBody = (await resp.json().catch(() => ({}))) as { error?: string };
        dispatch({ type: "SET_ERROR", payload: errBody.error || "Upload failed" });
        dispatch({ type: "REMOVE_ATTACHMENT", payload: id });
        return;
      }

      const { publicUrl, key } = (await resp.json()) as { publicUrl: string; key: string };
      dispatch({ type: "UPDATE_ATTACHMENT", payload: { id, url: publicUrl, key } });
    } catch {
      dispatch({ type: "SET_ERROR", payload: "Upload failed" });
      dispatch({ type: "REMOVE_ATTACHMENT", payload: id });
    }
  }, []);

  const removeAttachment = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ATTACHMENT", payload: id });
  }, []);

  return {
    state,
    actions: {
      setPromptTemplate,
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
