import { getModelContext } from "./feature-detect";
import { createMendTools, getToolNames, type MendToolCallbacks } from "./tools";
import type { MendToolName } from "./tool-schemas";

export type WebMcpStatus = {
  state: "checking" | "ready" | "unsupported" | "error";
  registeredTools: MendToolName[];
  message?: string;
};

type RegistrationOptions = MendToolCallbacks & {
  onStatus: (status: WebMcpStatus) => void;
};

export function registerMendTools(options: RegistrationOptions) {
  const modelContext = getModelContext();

  if (!modelContext) {
    options.onStatus({
      state: "unsupported",
      registeredTools: [],
      message: "This browser does not expose document.modelContext.",
    });
    return () => undefined;
  }

  const controller = new AbortController();
  const tools = createMendTools(options);
  let active = true;

  void Promise.all(
    tools.map((tool) =>
      modelContext.registerTool(tool, { signal: controller.signal }),
    ),
  )
    .then(() => {
      if (!active) {
        return;
      }

      options.onStatus({
        state: "ready",
        registeredTools: getToolNames(tools),
      });
    })
    .catch(() => {
      if (!active || controller.signal.aborted) {
        return;
      }

      controller.abort();
      options.onStatus({
        state: "error",
        registeredTools: [],
        message: "Mend could not register its WebMCP tools.",
      });
    });

  return () => {
    active = false;
    controller.abort();
  };
}
