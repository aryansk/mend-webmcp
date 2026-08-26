export class FixError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "fix_error", status = 422) {
    super(message);
    this.name = "FixError";
    this.code = code;
    this.status = status;
  }
}

export function getFixErrorMessage(error: unknown) {
  if (error instanceof FixError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The proposed fix could not be completed.";
}
