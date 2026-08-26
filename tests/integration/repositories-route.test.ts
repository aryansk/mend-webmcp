import { describe, expect, it } from "vitest";
import { POST as connectRepository } from "../../app/api/repositories/route";
import { GET as listFiles } from "../../app/api/repositories/files/route";
import { GET as inspectSource } from "../../app/api/repositories/source/route";

describe("repository API", () => {
  it("connects the controlled demo repo and exposes its source files", async () => {
    const connectResponse = await connectRepository(
      new Request("http://localhost/api/repositories", {
        method: "POST",
        body: JSON.stringify({ provider: "demo" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const connectPayload = (await connectResponse.json()) as {
      repository?: { id: string; fullName: string; fileCount: number };
      files?: Array<{ path: string }>;
    };

    expect(connectResponse.status).toBe(201);
    expect(connectPayload.repository).toMatchObject({
      id: "repo_demo_001",
      fullName: "mend/demo-site",
      fileCount: 5,
    });
    expect(connectPayload.files?.map((file) => file.path)).toContain(
      "components/Hero.tsx",
    );

    const filesResponse = await listFiles(
      new Request(
        "http://localhost/api/repositories/files?repositoryId=repo_demo_001",
      ),
    );
    const filesPayload = (await filesResponse.json()) as {
      files?: Array<{ path: string }>;
    };

    expect(filesResponse.status).toBe(200);
    expect(filesPayload.files).toHaveLength(5);
  });

  it("returns the source range mapped to a known issue", async () => {
    const response = await inspectSource(
      new Request(
        "http://localhost/api/repositories/source?repositoryId=repo_demo_001&issueId=issue_img_alt",
      ),
    );
    const payload = (await response.json()) as {
      source?: { filePath: string; lineStart: number; content: string };
      issue?: { id: string };
    };

    expect(response.status).toBe(200);
    expect(payload.issue?.id).toBe("issue_img_alt");
    expect(payload.source).toMatchObject({
      filePath: "components/Hero.tsx",
      lineStart: 15,
    });
    expect(payload.source?.content).toContain('alt=""');
  });

  it("rejects an unsafe source path", async () => {
    const response = await listFiles(
      new Request(
        "http://localhost/api/repositories/files?repositoryId=repo_demo_001&path=../package.json",
      ),
    );
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(403);
    expect(payload.code).toBe("path_not_allowed");
  });
});
