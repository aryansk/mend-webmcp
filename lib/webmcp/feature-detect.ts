import type { ModelContext } from "./types";

export function getModelContext(): ModelContext | null {
  if (typeof document === "undefined") {
    return null;
  }

  const modelContext = document.modelContext;

  return modelContext && typeof modelContext.registerTool === "function"
    ? modelContext
    : null;
}
