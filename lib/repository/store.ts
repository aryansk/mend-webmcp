import { createDemoRepository, DEMO_REPOSITORY_ID } from "./demo";
import type { RepositoryConnection } from "./types";

type RepositoryStoreGlobal = typeof globalThis & {
  __mendRepositoryStore?: Map<string, RepositoryConnection>;
};

const globalStore = globalThis as RepositoryStoreGlobal;
const repositories =
  globalStore.__mendRepositoryStore ?? new Map<string, RepositoryConnection>();

globalStore.__mendRepositoryStore = repositories;

export function connectDemoRepository() {
  const existing = repositories.get(DEMO_REPOSITORY_ID);

  if (existing) {
    return existing;
  }

  const repository = createDemoRepository();
  repositories.set(repository.id, repository);
  return repository;
}

export function getRepository(repositoryId: string) {
  if (repositoryId === DEMO_REPOSITORY_ID) {
    return repositories.get(repositoryId) ?? createDemoRepository();
  }

  return repositories.get(repositoryId);
}

export function listRepositories() {
  return Array.from(repositories.values());
}
