import { DEFAULT_MODEL } from "./models";
import type { GeneratorState, GeneratorAction } from "./types";
import { serializeVariableGroupsIntoTemplate, syncVariableGroupsFromTemplate } from "./utils";

export const initialState: GeneratorState = {
  promptTemplate: "",
  originalPromptTemplate: null,
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
      return {
        ...state,
        promptTemplate: action.payload,
        originalPromptTemplate: null,
        variableGroups: syncVariableGroupsFromTemplate(action.payload, state.variableGroups),
      };

    case "SET_EXPANDED_PROMPT_TEMPLATE":
      return {
        ...state,
        promptTemplate: action.payload.promptTemplate,
        originalPromptTemplate: action.payload.originalPromptTemplate,
        variableGroups: syncVariableGroupsFromTemplate(
          action.payload.promptTemplate,
          state.variableGroups,
        ),
      };

    case "SYNC_GROUPS_FROM_TEMPLATE": {
      return {
        ...state,
        variableGroups: syncVariableGroupsFromTemplate(state.promptTemplate, state.variableGroups),
      };
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

    case "ADD_VALUE": {
      const variableGroups = state.variableGroups.map((g) =>
        g.id === action.payload.groupId ? { ...g, values: [...g.values, ""] } : g,
      );
      return {
        ...state,
        variableGroups,
        promptTemplate: serializeVariableGroupsIntoTemplate(state.promptTemplate, variableGroups),
      };
    }

    case "UPDATE_VALUE": {
      const variableGroups = state.variableGroups.map((g) =>
        g.id === action.payload.groupId
          ? {
              ...g,
              values: g.values.map((v, i) =>
                i === action.payload.index ? action.payload.value : v,
              ),
            }
          : g,
      );
      return {
        ...state,
        variableGroups,
        promptTemplate: serializeVariableGroupsIntoTemplate(state.promptTemplate, variableGroups),
      };
    }

    case "REMOVE_VALUE": {
      const variableGroups = state.variableGroups.map((g) =>
        g.id === action.payload.groupId
          ? { ...g, values: g.values.filter((_, i) => i !== action.payload.index) }
          : g,
      );
      return {
        ...state,
        variableGroups,
        promptTemplate: serializeVariableGroupsIntoTemplate(state.promptTemplate, variableGroups),
      };
    }

    case "START_GENERATING":
      return { ...state, isGenerating: true, results: [], error: null };

    case "APPEND_RESULTS": {
      const seenIds = new Set(state.results.map((result) => result.id));
      const nextResults = action.payload.filter((result) => !seenIds.has(result.id));
      if (nextResults.length === 0) return state;
      return { ...state, results: [...state.results, ...nextResults] };
    }

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
