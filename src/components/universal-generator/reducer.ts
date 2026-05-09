import { DEFAULT_MODEL } from "./models";
import type { GeneratorState, GeneratorAction, GroupId } from "./types";
import { extractVariableGroups } from "./utils";

export const initialState: GeneratorState = {
  promptTemplate: "",
  variableGroups: [],
  results: [],
  isGenerating: false,
  quantity: 2,
  aspectRatio: "9:16",
  model: DEFAULT_MODEL,
  textLength: "medium",
  videoDuration: "5s",
  error: null,
  creditsRemaining: null,
  attachedFiles: [],
  progress: null,
};

export function reducer(state: GeneratorState, action: GeneratorAction): GeneratorState {
  switch (action.type) {
    case "SET_PROMPT_TEMPLATE":
      return { ...state, promptTemplate: action.payload };

    case "SYNC_GROUPS_FROM_TEMPLATE": {
      const newGroups = extractVariableGroups(state.promptTemplate);
      if (newGroups.length === state.variableGroups.length) return state;
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

    case "SET_TEXT_LENGTH":
      return { ...state, textLength: action.payload };

    case "SET_VIDEO_DURATION":
      return { ...state, videoDuration: action.payload };

    case "ADD_VALUE":
      return {
        ...state,
        variableGroups: state.variableGroups.map((g) =>
          g.id === action.payload.groupId ? { ...g, values: [...g.values, ""] } : g,
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

    case "SET_PROGRESS":
      return { ...state, progress: action.payload };

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
