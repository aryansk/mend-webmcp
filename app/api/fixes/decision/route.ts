import { getFixErrorMessage, FixError } from "../../../../lib/fixes/errors";
import {
  decideFix,
  getFixDiffPayload,
} from "../../../../lib/fixes/service";

export async function POST(request: Request) {
  let body: { fixId?: unknown; decision?: unknown };

  try {
    body = (await request.json()) as { fixId?: unknown; decision?: unknown };
  } catch {
    return Response.json(
      { error: "The approval decision must be valid JSON.", code: "invalid_json" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  if (typeof body.fixId !== "string" || body.fixId.trim() === "") {
    return Response.json(
      { error: "fixId is required.", code: "fix_required" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  if (body.decision !== "approved" && body.decision !== "rejected") {
    return Response.json(
      {
        error: "decision must be approved or rejected.",
        code: "invalid_decision",
      },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  try {
    const fix = await decideFix(body.fixId.trim(), body.decision);

    return Response.json(
      { fix: getFixDiffPayload(fix), approvalStatus: fix.approvalStatus },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    return Response.json(
      {
        error: getFixErrorMessage(error),
        code: error instanceof FixError ? error.code : "decision_failed",
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
