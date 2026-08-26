import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { DEMO_REPOSITORY_FILES } from "./demo";
import { RepositoryError } from "./errors";
import type { RepositoryFile, RepositoryFileContent } from "./types";

const DEMO_ROOT = path.resolve(process.cwd(), "demo-repo");
const MAX_SOURCE_BYTES = 200_000;
const allowedPaths = new Set<string>(DEMO_REPOSITORY_FILES);

export async function listDemoRepositoryFiles(): Promise<RepositoryFile[]> {
  return Promise.all(
    DEMO_REPOSITORY_FILES.map(async (filePath) => {
      const file = await readDemoRepositoryFile(filePath);

      return {
        path: file.path,
        size: file.size,
        language: file.language,
      };
    }),
  );
}

export async function readDemoRepositoryFile(
  filePath: string,
): Promise<RepositoryFileContent> {
  const safePath = validateRepositoryPath(filePath);
  const absolutePath = path.resolve(DEMO_ROOT, safePath);
  let relativePath = path.relative(DEMO_ROOT, absolutePath);

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    !allowedPaths.has(safePath)
  ) {
    throw new RepositoryError(
      "That source path is not part of the connected repository.",
      "path_not_allowed",
      403,
    );
  }

  try {
    const metadata = await stat(absolutePath);

    if (metadata.size > MAX_SOURCE_BYTES) {
      throw new RepositoryError(
        "The requested source file is larger than the safe read limit.",
        "file_too_large",
        413,
      );
    }

    const content = await readFile(absolutePath, "utf8");

    return {
      path: safePath,
      size: metadata.size,
      language: getLanguage(safePath),
      content,
    };
  } catch (error) {
    if (error instanceof RepositoryError) {
      throw error;
    }

    throw new RepositoryError(
      "The requested source file could not be read.",
      "file_not_found",
      404,
    );
  }
}

function validateRepositoryPath(filePath: string) {
  if (
    typeof filePath !== "string" ||
    filePath.trim() === "" ||
    filePath.includes("\\") ||
    path.posix.isAbsolute(filePath)
  ) {
    throw new RepositoryError(
      "Source paths must be non-empty relative paths.",
      "invalid_path",
      400,
    );
  }

  const normalized = path.posix.normalize(filePath);

  if (
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new RepositoryError(
      "Source paths cannot leave the connected repository.",
      "path_not_allowed",
      403,
    );
  }

  return normalized;
}

function getLanguage(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  return (
    {
      ".md": "Markdown",
      ".tsx": "TSX",
    }[extension] ?? "Text"
  );
}
