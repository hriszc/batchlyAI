import { useState, useMemo, useCallback, useRef } from "react";

import type { AiBlock } from "./types";
import { extractAiBlocks, replaceAiBlock } from "./utils";

export interface ExpandActions {
  expandBlocks: AiBlock[];
  isExpanding: boolean;
  hasExpanded: boolean;
  doExpand: () => Promise<void>;
  undoExpand: () => void;
}

export function useExpandVariables(
  promptTemplate: string,
  setPromptTemplate: (value: string) => void,
  setExpandedPromptTemplate: (value: string, originalPromptTemplate: string) => void,
): ExpandActions {
  const [isExpanding, setIsExpanding] = useState(false);
  const previousRef = useRef<string | null>(null);
  const [hasExpanded, setHasExpanded] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const expandBlocks = useMemo(() => extractAiBlocks(promptTemplate), [promptTemplate]);

  const doExpand = useCallback(async () => {
    if (expandBlocks.length === 0 || isExpanding) return;

    // Abort any in-flight request
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setIsExpanding(true);
    previousRef.current = promptTemplate;

    try {
      const descriptions = expandBlocks.map((b) => b.description);
      const resp = await fetch("/api/expand-vars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptions }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        previousRef.current = null;
        return;
      }

      const json = (await resp.json()) as {
        results: Record<string, string[]>;
      };

      let updated = promptTemplate;
      let anyExpanded = false;

      for (const block of expandBlocks) {
        const values = json.results[block.description];
        if (values?.length) {
          updated = replaceAiBlock(updated, block.raw, values);
          anyExpanded = true;
        }
      }

      if (anyExpanded) {
        setExpandedPromptTemplate(updated, promptTemplate);
        setHasExpanded(true);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      previousRef.current = null;
    } finally {
      setIsExpanding(false);
    }
  }, [expandBlocks, promptTemplate, setExpandedPromptTemplate, isExpanding]);

  const undoExpand = useCallback(() => {
    if (previousRef.current !== null) {
      controllerRef.current?.abort();
      setPromptTemplate(previousRef.current);
      previousRef.current = null;
      setHasExpanded(false);
    }
  }, [setPromptTemplate]);

  return { expandBlocks, isExpanding, hasExpanded, doExpand, undoExpand };
}
