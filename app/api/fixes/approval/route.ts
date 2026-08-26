import { getFixErrorMessage, FixError } from "../../../../lib/fixes/errors";
import {
  getFixDiffPayload,
  requestFixApproval,
} from "../../../../lib/fixes/service";

export async function POST(request: Request) {
  let body: { fixId?: unknown };

  try {
    body = (await request.json()) as { fixId?: unknown };
  } catch {
    return Response.json(
      { error: "The approval request must be valid JSON.", code: "invalid_json" },
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
    const fix = await requestFixApproval(body.fixId.trim());

    return Response.json(
      {
        fix: getFixDiffPayload(fix),
        approvalStatus: "waiting_for_human",
        requiresHumanApproval: true,
      },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    return Response.json(
      {
        error: getFixErrorMessage(error),
        code: error instanceof FixError ? error.code : "approval_failed",
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
