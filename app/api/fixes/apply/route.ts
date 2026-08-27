import { applyApprovedFix } from "../../../../lib/fixes/apply";
import { getFixErrorMessage, FixError } from "../../../../lib/fixes/errors";
import { getFixDiffPayload } from "../../../../lib/fixes/service";
import {
  createWorkspaceReceipt,
  requestHasWorkspaceReceipt,
  serializeWorkspaceReceiptCookie,
} from "../../../../lib/workspace/receipts";

export async function POST(request: Request) {
  let body: { fixId?: unknown };

  try {
    body = (await request.json()) as { fixId?: unknown };
  } catch {
    return Response.json(
      { error: "The apply request must be valid JSON.", code: "invalid_json" },
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
    const fixId = body.fixId.trim();
    const approvedByReceipt = requestHasWorkspaceReceipt(
      request,
      "approval",
      fixId,
    );
    const result = await applyApprovedFix(fixId, approvedByReceipt);

    if (!result.fix) {
      throw new FixError("The proposed fix was not found.", "fix_not_found", 404);
    }

    const appliedReceipt = createWorkspaceReceipt("applied", fixId);
    const headers: Record<string, string> = noStoreHeaders();

    if (appliedReceipt) {
      headers["Set-Cookie"] = serializeWorkspaceReceiptCookie(
        "applied",
        appliedReceipt,
      );
    }

    return Response.json(
      {
        applied: true,
        fix: getFixDiffPayload(result.fix),
        branch: result.branch,
        sourceMutation: false,
      },
      { headers },
    );
  } catch (error) {
    return Response.json(
      {
        error: getFixErrorMessage(error),
        code: error instanceof FixError ? error.code : "apply_failed",
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
