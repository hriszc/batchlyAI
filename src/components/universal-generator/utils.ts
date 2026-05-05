import type { VariableGroup, PromptCombination } from "./types";

export function extractVariableGroups(template: string): VariableGroup[] {
  const regex = /\{\{(.+?)\}\}/g;
  const groups: VariableGroup[] = [];
  let idx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    const values = raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    groups.push({ id: `var_${idx++}`, values });
  }
  return groups;
}

export function computeCombinations(groups: VariableGroup[]): Record<string, string>[] {
  const validGroups = groups.filter((g) => g.values.length > 0);
  if (validGroups.length === 0) return [];

  let combinations: Record<string, string>[] = validGroups[0].values.map((v) => ({
    [`var_0`]: v,
  }));

  for (let i = 1; i < validGroups.length; i++) {
    const newCombos: Record<string, string>[] = [];
    for (const combo of combinations) {
      for (const value of validGroups[i].values) {
        newCombos.push({ ...combo, [`var_${i}`]: value });
      }
    }
    combinations = newCombos;
  }

  return combinations;
}

export function interpolatePrompt(template: string, variables: Record<string, string>): string {
  const groups = extractVariableGroups(template);
  let result = template;
  groups.forEach((group, idx) => {
    const value = variables[`var_${idx}`];
    if (value) {
      result = result.replace(/\{\{(.+?)\}\}/, value);
    }
  });
  return result;
}

export function computePromptCombinations(
  template: string,
  groups: VariableGroup[],
): PromptCombination[] {
  const combinations = computeCombinations(groups);
  if (combinations.length === 0 && template.trim()) {
    return [{ variables: {}, prompt: template.trim() }];
  }
  return combinations.map((vars) => ({
    variables: vars,
    prompt: interpolatePrompt(template, vars),
  }));
}

export function getCombinationCount(groups: VariableGroup[]): number {
  const valid = groups.filter((g) => g.values.length > 0);
  if (valid.length === 0) return 0;
  return valid.reduce((acc, g) => acc * g.values.length, 1);
}
