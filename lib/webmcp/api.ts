export class MendApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "MendApiError";
    this.code = code;
    this.status = status;
  }
}

export async function requestMendApi(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new MendApiError(
      "Mend could not reach the audit service.",
      "request_failed",
      0,
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const body = asRecord(payload);
    const message =
      typeof body.error === "string"
        ? body.error
        : "The audit service rejected the request.";
    const code = typeof body.code === "string" ? body.code : "request_failed";

    throw new MendApiError(message, code, response.status);
  }

  return payload;
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The audit service returned an invalid response.");
  }

  return value as Record<string, unknown>;
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
