import { getFixErrorMessage, FixError } from "../../../lib/fixes/errors";
import { getFixDiffPayload } from "../../../lib/fixes/service";
import { verifyFix } from "../../../lib/verification/service";

export async function POST(request: Request) {
  let body: { fixId?: unknown; previewUrl?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { error: "The verification request must be valid JSON.", code: "invalid_json" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  if (typeof body.fixId !== "string" || body.fixId.trim() === "") {
    return Response.json(
      { error: "fixId is required.", code: "fix_required" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  try {
    const result = await verifyFix(body.fixId.trim(), body.previewUrl);

    if (!result.fix) {
      throw new FixError("The proposed fix was not found.", "fix_not_found", 404);
    }

    return Response.json(
      {
        verified: result.verification.verified,
        verification: result.verification,
        fix: getFixDiffPayload(result.fix),
        beforeAudit: result.beforeAudit,
        afterAudit: result.afterAudit,
      },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    return Response.json(
      {
        error: getFixErrorMessage(error),
        code: error instanceof FixError ? error.code : "verification_failed",
      },
      {
        status: error instanceof FixError ? error.status : 500,
        headers: noStoreHeaders(),
      },
    );
  }
}

function noStoreHeaders() {
  return { "Cache-Control": "no-store" };
}
