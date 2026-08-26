export class AuditError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "audit_failed", status = 422) {
    super(message);
    this.name = "AuditError";
    this.code = code;
    this.status = status;
  }
}

export function getAuditErrorMessage(error: unknown) {
  if (error instanceof AuditError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The audit could not be completed.";
}
