export class RepositoryError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "repository_error", status = 422) {
    super(message);
    this.name = "RepositoryError";
    this.code = code;
    this.status = status;
  }
}

export function getRepositoryErrorMessage(error: unknown) {
  if (error instanceof RepositoryError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The repository request could not be completed.";
}
