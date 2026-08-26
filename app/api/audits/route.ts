import { getAuditErrorMessage, AuditError } from "../../../lib/audit/errors";
import { getAudit, getLatestAudit } from "../../../lib/audit/store";
import {
  normalizeCategories,
  runAuditForUrl,
} from "../../../lib/audit/scanner";
import { getAuditSummary } from "../../../lib/audit/summary";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auditId = searchParams.get("auditId");
  const siteUrl = searchParams.get("siteUrl");
  const audit = auditId
    ? getAudit(auditId)
    : siteUrl
      ? getLatestAudit(siteUrl)
      : undefined;

  if (!audit) {
    return Response.json(
      { error: "Audit not found." },
      { status: 404, headers: noStoreHeaders() },
    );
  }

  return Response.json(
    { audit, summary: getAuditSummary(audit) },
    { headers: noStoreHeaders() },
  );
}

export async function POST(request: Request) {
  let body: { url?: unknown; categories?: unknown };

  try {
    body = (await request.json()) as { url?: unknown; categories?: unknown };
  } catch {
    return Response.json(
      { error: "The audit request must be valid JSON." },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  try {
    const audit = await runAuditForUrl(
      body.url,
      normalizeCategories(body.categories),
    );

    return Response.json(
      { audit, summary: getAuditSummary(audit) },
      { status: 201, headers: noStoreHeaders() },
    );
  } catch (error) {
    const status = error instanceof AuditError ? error.status : 500;

    return Response.json(
      {
        error: getAuditErrorMessage(error),
        code: error instanceof AuditError ? error.code : "audit_failed",
      },
      { status, headers: noStoreHeaders() },
    );
  }
}

function noStoreHeaders() {
  return { "Cache-Control": "no-store" };
}
