import {
  getRepositoryErrorMessage,
  RepositoryError,
} from "../../../lib/repository/errors";
import { listDemoRepositoryFiles } from "../../../lib/repository/files";
import {
  connectDemoRepository,
  getRepository,
  listRepositories,
} from "../../../lib/repository/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repositoryId = searchParams.get("repositoryId");

  if (!repositoryId) {
    return Response.json(
      { repositories: listRepositories() },
      { headers: noStoreHeaders() },
    );
  }

  const repository = getRepository(repositoryId);

  if (!repository) {
    return Response.json(
      { error: "Repository not found.", code: "repository_not_found" },
      { status: 404, headers: noStoreHeaders() },
    );
  }

  return Response.json(
    { repository },
    { headers: noStoreHeaders() },
  );
}

export async function POST(request: Request) {
  let body: { provider?: unknown };

  try {
    body = (await request.json()) as { provider?: unknown };
  } catch {
    return Response.json(
      { error: "The repository request must be valid JSON." },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  if (body.provider !== "demo") {
    return Response.json(
      {
        error:
          "Only the controlled Mend demo repository is available in this phase.",
        code: "github_oauth_not_configured",
      },
      { status: 501, headers: noStoreHeaders() },
    );
  }

  try {
    const repository = connectDemoRepository();
    const files = await listDemoRepositoryFiles();

    return Response.json(
      { repository, files },
      { status: 201, headers: noStoreHeaders() },
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
