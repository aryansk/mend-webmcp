export type RepositoryProvider = "demo" | "github";

export type RepositoryConnection = {
  id: string;
  provider: RepositoryProvider;
  owner: string;
  name: string;
  fullName: string;
  branch: string;
  visibility: "public" | "private";
  fileCount: number;
  connectedAt: string;
};

export type RepositoryFile = {
  path: string;
  size: number;
  language: string;
};

export type RepositoryFileContent = RepositoryFile & {
  content: string;
};

export type RepositorySourceView = {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  content: string;
  confidence: number;
  reason: string;
};
