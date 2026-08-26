import { demoAudit } from "../../../../lib/demo-data";
import {
  getRepositoryErrorMessage,
  RepositoryError,
} from "../../../../lib/repository/errors";
import { readDemoRepositoryFile } from "../../../../lib/repository/files";
import { resolveIssueSource } from "../../../../lib/repository/mapping";
import { getRepository } from "../../../../lib/repository/store";
import { getAuditForIssue } from "../../../../lib/audit/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repositoryId = searchParams.get("repositoryId");
  const issueId = searchParams.get("issueId");
  const filePath = searchParams.get("path");

  if (!repositoryId) {
    return Response.json(
      { error: "repositoryId is required.", code: "repository_required" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  const repository = getRepository(repositoryId);

  if (!repository) {
    return Response.json(
      { error: "Repository not found.", code: "repository_not_found" },
      { status: 404, headers: noStoreHeaders() },
    );
  }

  try {
    if (issueId) {
      const storedAudit = getAuditForIssue(issueId);
      const issue =
        storedAudit?.issues.find((candidate) => candidate.id === issueId) ??
        demoAudit.issues.find((candidate) => candidate.id === issueId);

      if (!issue) {
        throw new RepositoryError(
          "The requested issue does not have a source mapping.",
          "source_unmapped",
          404,
        );
      }

      const source = await resolveIssueSource(repository, issue);

      return Response.json(
        { repository, issue, source },
        { headers: noStoreHeaders() },
      );
    }

    if (!filePath) {
      return Response.json(
        { error: "issueId or path is required.", code: "source_required" },
        { status: 400, headers: noStoreHeaders() },
      );
    }

    const file = await readDemoRepositoryFile(filePath);

    return Response.json(
      {
        repository,
        source: {
          filePath: file.path,
          lineStart: 1,
          lineEnd: Math.max(1, file.content.split("\n").length),
          content: file.content,
          confidence: 1,
          reason: "The file was explicitly selected from the connected repository.",
        },
      },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    const status = error instanceof RepositoryError ? error.status : 500;

    return Response.json(
      {
        error: getRepositoryErrorMessage(error),
        code: error instanceof RepositoryError ? error.code : "repository_failed",
      },
      { status, headers: noStoreHeaders() },
    );
  }
}

function noStoreHeaders() {
  return { "Cache-Control": "no-store" };
}
