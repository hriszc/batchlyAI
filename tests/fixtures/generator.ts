import { DEFAULT_MODEL } from "@/components/universal-generator/models";
import type {
  GeneratorState,
  VariableGroup,
  GeneratedResult,
} from "@/components/universal-generator/types";

export function createVariableGroup(overrides?: Partial<VariableGroup>): VariableGroup {
  return {
    id: "var_0",
    values: ["cat", "dog"],
    ...overrides,
  };
}

export function createGeneratorState(overrides?: Partial<GeneratorState>): GeneratorState {
  return {
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
    ...overrides,
  };
}

export function createResult(overrides?: Partial<GeneratedResult>): GeneratedResult {
  return {
    id: "result_test_001",
    combination: {
      variables: { var_0: "cat" },
      prompt: "A cat in a forest",
    },
    imageUrl: "https://example.com/image.png",
    textContent: null,
    watermark: false,
    status: "complete",
    ...overrides,
  };
}

export const TEMPLATES = {
  empty: "",
  noVariables: "A beautiful landscape",
  singleVariable: "{{cat}}",
  multiValueSingleGroup: "{{cat, dog, bird}}",
  multiGroup: "A {{cat, dog}} in {{forest, beach}}",
  threeGroups: "{{red, blue}} {{car, bike}} in {{day, night}}",
  chineseVars: "一只{{猫, 狗}}在{{森林, 海滩}}",
  specialChars: "{{hello world, foo-bar, a.b.c}}",
  withWhitespace: "{{  cat ,  dog  }}",
  adjacentVariables: "{{a}}{{b}}{{c}}",
  emptyGroup: "before {{}} after",
  whitespaceOnlyGroup: "{{ ,  }}",
} as const;
