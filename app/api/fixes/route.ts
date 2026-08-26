import { demoAudit } from "../../../lib/demo-data";
import { getAuditForIssue } from "../../../lib/audit/store";
import { getFixErrorMessage, FixError } from "../../../lib/fixes/errors";
import {
  generateProposedFix,
} from "../../../lib/fixes/generator";
import {
  getFixDiffPayload,
  getFixOrRebuildDemo,
} from "../../../lib/fixes/service";
import { getRepository } from "../../../lib/repository/store";
import type { Issue } from "../../../lib/types";

export async function GET(request: Request) {
  const fixId = new URL(request.url).searchParams.get("fixId");

  if (!fixId) {
    return Response.json(
      { error: "fixId is required.", code: "fix_required" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  try {
    const fix = await getFixOrRebuildDemo(fixId);

    if (!fix) {
      throw new FixError("The proposed fix was not found.", "fix_not_found", 404);
    }

    return Response.json(
      { fix: getFixDiffPayload(fix) },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let body: {
    repositoryId?: unknown;
    issueIds?: unknown;
    constraints?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { error: "The fix request must be valid JSON.", code: "invalid_json" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  try {
    const repositoryId = readRequiredString(body.repositoryId, "repositoryId");
    const issueIds = readStringArray(body.issueIds, "issueIds", 1, 6);
    const constraints = readStringArray(
      body.constraints,
      "constraints",
      0,
      4,
    );
    const repository = getRepository(repositoryId);

    if (!repository) {
      throw new FixError("Repository not found.", "repository_not_found", 404);
    }

    const issues = issueIds.map((issueId) => findIssue(issueId));

    if (issues.some((issue) => !issue)) {
      throw new FixError(
        "One or more selected issues could not be found.",
        "issue_not_found",
        404,
      );
    }

    const fix = await generateProposedFix({
      repository,
      issues: issues as Issue[],
      constraints,
    });

    return Response.json(
      {
        fix: getFixDiffPayload(fix),
        summary: {
          fixId: fix.id,
          status: fix.status,
          approvalStatus: fix.approvalStatus,
          filesChanged: fix.files.length,
          requiresHumanApproval: true,
        },
      },
      { status: 201, headers: noStoreHeaders() },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function findIssue(issueId: string) {
  const storedAudit = getAuditForIssue(issueId);
  const storedIssue = storedAudit?.issues.find((issue) => issue.id === issueId);

  return storedIssue ?? demoAudit.issues.find((issue) => issue.id === issueId);
}

function readRequiredString(value: unknown, key: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new FixError(key + " is required.", "invalid_input", 400);
  }

  return value.trim();
}

function readStringArray(value: unknown, key: string, minimum: number, maximum: number) {
  if (value === undefined && minimum === 0) {
    return [];
  }

  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    throw new FixError(
      key + " must contain between " + minimum + " and " + maximum + " non-empty strings.",
      "invalid_input",
      400,
    );
  }

  return Array.from(new Set(value.map((item) => (item as string).trim())));
}

function errorResponse(error: unknown) {
  return Response.json(
    {
      error: getFixErrorMessage(error),
      code: error instanceof FixError ? error.code : "fix_failed",
    },
    {
      status: error instanceof FixError ? error.status : 500,
      headers: noStoreHeaders(),
    },
  );
}

function noStoreHeaders() {
  return { "Cache-Control": "no-store" };
}
