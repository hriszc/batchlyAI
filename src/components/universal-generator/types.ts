export type GroupId = string;

export interface AiBlock {
  raw: string;
  description: string;
}

export interface VariableGroup {
  id: GroupId;
  values: string[];
}

export interface PromptCombination {
  variables: Record<string, string>;
  prompt: string;
}

export interface GeneratedResult {
  id: string;
  combination: PromptCombination;
  imageUrl: string | null;
  textContent: string | null;
  watermark: boolean;
  status: "pending" | "generating" | "complete" | "error";
}

export interface AttachedFile {
  id: string;
  name: string;
  key?: string;
  url?: string;
  uploading: boolean;
}

export interface GeneratorState {
  promptTemplate: string;
  variableGroups: VariableGroup[];
  results: GeneratedResult[];
  isGenerating: boolean;
  quantity: number;
  aspectRatio: string;
  model: string;
  error: string | null;
  creditsRemaining: number | null;
  attachedFiles: AttachedFile[];
}

export type GeneratorAction =
  | { type: "SET_PROMPT_TEMPLATE"; payload: string }
  | { type: "SYNC_GROUPS_FROM_TEMPLATE" }
  | { type: "SET_QUANTITY"; payload: number }
  | { type: "SET_ASPECT_RATIO"; payload: string }
  | { type: "SET_MODEL"; payload: string }
  | { type: "ADD_VALUE"; payload: { groupId: GroupId } }
  | { type: "UPDATE_VALUE"; payload: { groupId: GroupId; index: number; value: string } }
  | { type: "REMOVE_VALUE"; payload: { groupId: GroupId; index: number } }
  | { type: "START_GENERATING" }
  | { type: "FINISH_GENERATING"; payload: GeneratedResult[] }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_CREDITS_REMAINING"; payload: number | null }
  | { type: "ADD_ATTACHMENT"; payload: AttachedFile }
  | { type: "UPDATE_ATTACHMENT"; payload: { id: string; url: string; key: string } }
  | { type: "REMOVE_ATTACHMENT"; payload: string };
