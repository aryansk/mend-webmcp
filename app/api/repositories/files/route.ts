import {
  getRepositoryErrorMessage,
  RepositoryError,
} from "../../../../lib/repository/errors";
import {
  listDemoRepositoryFiles,
  readDemoRepositoryFile,
} from "../../../../lib/repository/files";
import { getRepository } from "../../../../lib/repository/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repositoryId = searchParams.get("repositoryId");
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
    if (filePath) {
      const file = await readDemoRepositoryFile(filePath);

      return Response.json(
        { repository, file },
        { headers: noStoreHeaders() },
      );
    }

    const files = await listDemoRepositoryFiles();

    return Response.json(
      { repository, files },
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
