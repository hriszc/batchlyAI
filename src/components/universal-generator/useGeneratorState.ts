import { useReducer, useCallback, useEffect, useRef } from "react";
import type { GeneratorState, GeneratorAction, GroupId } from "./types";
import { extractVariableGroups, computePromptCombinations } from "./utils";
import { DEFAULT_MODEL, MODELS } from "./models";

function generateResultId(): string {
  return `result_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const initialState: GeneratorState = {
  promptTemplate: "",
  variableGroups: [],
  results: [],
  isGenerating: false,
  quantity: 2,
  aspectRatio: "9:16",
  model: DEFAULT_MODEL,
  error: null,
  creditsRemaining: null,
  attachedFiles: [],
};

export function reducer(state: GeneratorState, action: GeneratorAction): GeneratorState {
  switch (action.type) {
    case "SET_PROMPT_TEMPLATE":
      return { ...state, promptTemplate: action.payload };

    case "SYNC_GROUPS_FROM_TEMPLATE": {
      const newGroups = extractVariableGroups(state.promptTemplate);
      if (newGroups.length === state.variableGroups.length) {
        return state;
      }
      const merged = newGroups.map((newGroup, idx) => {
        const existing = state.variableGroups[idx];
        if (existing) return existing;
        return newGroup;
      });
      return { ...state, variableGroups: merged };
    }

    case "SET_QUANTITY":
      return { ...state, quantity: action.payload };

    case "SET_ASPECT_RATIO":
      return { ...state, aspectRatio: action.payload };

    case "SET_MODEL":
      return { ...state, model: action.payload };

    case "ADD_VALUE":
      return {
        ...state,
        variableGroups: state.variableGroups.map((g) =>
          g.id === action.payload.groupId
            ? { ...g, values: [...g.values, ""] }
            : g,
        ),
      };

    case "UPDATE_VALUE":
      return {
        ...state,
        variableGroups: state.variableGroups.map((g) =>
          g.id === action.payload.groupId
            ? {
                ...g,
                values: g.values.map((v, i) =>
                  i === action.payload.index ? action.payload.value : v,
                ),
              }
            : g,
        ),
      };

    case "REMOVE_VALUE":
      return {
        ...state,
        variableGroups: state.variableGroups.map((g) =>
          g.id === action.payload.groupId
            ? { ...g, values: g.values.filter((_, i) => i !== action.payload.index) }
            : g,
        ),
      };

    case "START_GENERATING":
      return { ...state, isGenerating: true, results: [], error: null };

    case "FINISH_GENERATING":
      return { ...state, isGenerating: false, results: action.payload };

    case "SET_ERROR":
      return { ...state, isGenerating: false, error: action.payload };

    case "SET_CREDITS_REMAINING":
      return { ...state, creditsRemaining: action.payload };

    case "ADD_ATTACHMENT":
      return { ...state, attachedFiles: [...state.attachedFiles, action.payload] };

    case "UPDATE_ATTACHMENT":
      return {
        ...state,
        attachedFiles: state.attachedFiles.map((f) =>
          f.id === action.payload.id
            ? { ...f, url: action.payload.url, key: action.payload.key, uploading: false }
            : f,
        ),
      };

    case "REMOVE_ATTACHMENT":
      return {
        ...state,
        attachedFiles: state.attachedFiles.filter((f) => f.id !== action.payload),
      };

    default:
      return state;
  }
}

export function useGeneratorState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

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

    const combinations = computePromptCombinations(
      currentState.promptTemplate,
      currentState.variableGroups,
    );

    const model = MODELS.find((m) => m.id === currentState.model);
    const isImageModel = model?.category === "image";

    if (isImageModel) {
      Promise.all(
        combinations.map(async (combination) => {
          try {
            const resp = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: combination.prompt,
                aspectRatio: currentState.aspectRatio,
                n: currentState.quantity,
                model: currentState.model,
              }),
            });
            const json = (await resp.json()) as {
              urls?: string[];
              error?: string;
              required?: number;
              available?: number;
              creditsRemaining?: number;
            };

            if (resp.status === 401) {
              dispatch({ type: "SET_ERROR", payload: "Please login to generate" });
              return [];
            }

            if (resp.status === 402) {
              dispatch({
                type: "SET_ERROR",
                payload: `Insufficient credits: need ${json.required}, have ${json.available}`,
              });
              dispatch({ type: "SET_CREDITS_REMAINING", payload: json.available ?? null });
              return [];
            }

            if (!resp.ok || json.error) {
              return {
                id: generateResultId(),
                combination,
                imageUrl: null,
                status: "error" as const,
              };
            }

            if (json.creditsRemaining != null) {
              dispatch({ type: "SET_CREDITS_REMAINING", payload: json.creditsRemaining });
            }

            return (json.urls || []).map((url) => ({
              id: generateResultId(),
              combination,
              imageUrl: url,
              status: "complete" as const,
            }));
          } catch {
            return [
              {
                id: generateResultId(),
                combination,
                imageUrl: null,
                status: "error" as const,
              },
            ];
          }
        }),
      ).then((resultGroups) => {
        dispatch({
          type: "FINISH_GENERATING",
          payload: resultGroups.flat(),
        });
      });
    } else {
      // Simulated generation for non-image models
      setTimeout(() => {
        const results = combinations.map((combination) => ({
          id: generateResultId(),
          combination,
          imageUrl: null,
          status: "complete" as const,
        }));
        dispatch({ type: "FINISH_GENERATING", payload: results });
      }, 1500);
    }
  }, []);

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
        headers: { "X-File-Name": encodeURIComponent(file.name) },
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
      startGenerating,
      setError,
      uploadFile,
      removeAttachment,
    },
  };
}
