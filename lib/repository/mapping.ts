import type { Issue } from "../types";
import { readDemoRepositoryFile } from "./files";
import { RepositoryError } from "./errors";
import type {
  RepositoryConnection,
  RepositorySourceView,
} from "./types";

export async function resolveIssueSource(
  repository: RepositoryConnection,
  issue: Issue,
): Promise<RepositorySourceView> {
  if (repository.provider !== "demo") {
    throw new RepositoryError(
      "This repository provider is not enabled in the demo connector.",
      "provider_not_enabled",
      501,
    );
  }

  const sourceHint = issue.sourceHint;

  if (!sourceHint?.filePath) {
    throw new RepositoryError(
      "This issue does not have a confident source file mapping.",
      "source_unmapped",
      404,
    );
  }

  const file = await readDemoRepositoryFile(sourceHint.filePath);
  const totalLines = Math.max(1, file.content.split("\n").length);
  const lineStart = clampLine(sourceHint.lineStart ?? 1, totalLines);
  const lineEnd = clampLine(sourceHint.lineEnd ?? lineStart, totalLines);

  return {
    filePath: file.path,
    lineStart: Math.min(lineStart, lineEnd),
    lineEnd: Math.max(lineStart, lineEnd),
    content: file.content,
    confidence: sourceHint.confidence,
    reason:
      sourceHint.reason ??
      "The connected repository contains the source file suggested by the audit.",
  };
}

function clampLine(line: number, totalLines: number) {
  return Math.min(totalLines, Math.max(1, Math.round(line)));
}
