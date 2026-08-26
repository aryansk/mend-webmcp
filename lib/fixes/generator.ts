import type {
  FilePatch,
  Issue,
  ProposedFix,
} from "../types";
import { readDemoRepositoryFile } from "../repository/files";
import type { RepositoryConnection } from "../repository/types";
import { FixError } from "./errors";
import { createFileDiff } from "./diff";
import { saveProposedFix } from "./store";

type PatchRule = {
  path: string;
  expectedImpact: string;
  apply: (source: string) => string;
};

const patchRules: Record<string, PatchRule> = {
  issue_img_alt: {
    path: "components/Hero.tsx",
    expectedImpact:
      "Gives the hero image a meaningful accessible name without changing its layout.",
    apply: (source) =>
      replaceOnce(
        source,
        '          alt=""',
        '          alt="Team reviewing a website audit"',
      ),
  },
  issue_form_label: {
    path: "components/NewsletterForm.tsx",
    expectedImpact:
      "Names the email control for assistive technology without adding visible UI.",
    apply: (source) =>
      replaceOnce(
        source,
        '          id="email"\n',
        '          id="email"\n          aria-label="Email address"\n',
      ),
  },
  issue_hero_size: {
    path: "components/Hero.tsx",
    expectedImpact:
      "Requests a right-sized hero asset and declares dimensions to reduce layout work.",
    apply: (source) =>
      replaceOnce(
        source,
        '          src="/images/hero.webp"\n',
        '          src="/images/hero-640.webp"\n          width={640}\n          height={420}\n',
      ),
  },
  issue_heading_order: {
    path: "app/features/page.tsx",
    expectedImpact:
      "Restores a navigable heading outline without changing the rendered visual style.",
    apply: (source) =>
      replaceOnce(
        source,
        "            <h3>Human approval</h3>",
        "            <h2>Human approval</h2>",
      ),
  },
  issue_blocking_script: {
    path: "app/layout.tsx",
    expectedImpact:
      "Allows initial rendering to continue before the non-critical analytics request.",
    apply: (source) =>
      replaceOnce(
        source,
        '        <script src="/analytics.js"></script>',
        '        <script defer src="/analytics.js"></script>',
      ),
  },
  issue_meta_description: {
    path: "app/layout.tsx",
    expectedImpact:
      "Adds a concise search-result summary to the root metadata object.",
    apply: (source) =>
      replaceOnce(
        source,
        '  title: "Mend demo site",\n',
        '  title: "Mend demo site",\n  description: "Repair the details that make a site easier to use.",\n',
      ),
  },
};
let fixSequence = 0;

export async function generateProposedFix(input: {
  repository: RepositoryConnection;
  issues: Issue[];
  constraints: string[];
  id?: string;
}) {
  if (input.repository.provider !== "demo") {
    throw new FixError(
      "Proposed fixes are currently enabled only for the controlled demo repository.",
      "provider_not_enabled",
      501,
    );
  }

  if (input.issues.length === 0) {
    throw new FixError(
      "Select at least one mapped issue before proposing a fix.",
      "issues_required",
      400,
    );
  }

  const issueIds = Array.from(new Set(input.issues.map((issue) => issue.id)));
  const grouped = new Map<
    string,
    { original: string; proposed: string; issueIds: string[] }
  >();
  const expectedImpact: string[] = [];

  for (const issue of input.issues) {
    const rule = patchRules[issue.id];

    if (!rule) {
      throw new FixError(
        "No safe deterministic patch is available for the selected issue.",
        "patch_not_available",
        422,
      );
    }

    if (issue.sourceHint?.filePath !== rule.path) {
      throw new FixError(
        "The issue source mapping does not match the safe patch plan.",
        "source_mapping_mismatch",
        409,
      );
    }

    let file = grouped.get(rule.path);

    if (!file) {
      const source = await readDemoRepositoryFile(rule.path);
      file = {
        original: source.content,
        proposed: source.content,
        issueIds: [],
      };
      grouped.set(rule.path, file);
    }

    file.proposed = rule.apply(file.proposed);
    file.issueIds.push(issue.id);

    if (!expectedImpact.includes(rule.expectedImpact)) {
      expectedImpact.push(rule.expectedImpact);
    }
  }

  const files: FilePatch[] = Array.from(grouped.entries()).map(
    ([path, file]) => {
      const diff = createFileDiff(path, file.original, file.proposed);

      return {
        path,
        original: file.original,
        proposed: file.proposed,
        diff: diff.diff,
        additions: diff.additions,
        deletions: diff.deletions,
      };
    },
  );
  const fix: ProposedFix = {
    id: input.id ?? createFixId(issueIds),
    repositoryId: input.repository.id,
    issueIds,
    files,
    explanation:
      "Prepared a deterministic source patch across " +
      files.length +
      " file" +
      (files.length === 1 ? "" : "s") +
      ". It changes only the mapped issue lines and preserves navigation and visual layout.",
    expectedImpact,
    constraints: input.constraints,
    createdAt: new Date().toISOString(),
    status: "proposed",
    approvalStatus: "not_requested",
  };

  return saveProposedFix(fix);
}

export function decodeDemoFixIssueIds(fixId: string) {
  const prefix = "fix_demo_";

  if (!fixId.startsWith(prefix)) {
    return undefined;
  }

  const encoded = fixId.slice(prefix.length).split("_")[0];

  if (!encoded) {
    return undefined;
  }

  return encoded
    .split(".")
    .filter(Boolean)
    .map((issueId) => issueId.replaceAll("~", "_"));
}

function createFixId(issueIds: string[]) {
  const encoded = issueIds
    .map((issueId) => issueId.replace(/[^a-zA-Z0-9]/g, "~"))
    .join(".");

  fixSequence += 1;
  return "fix_demo_" + encoded + "_" + Date.now().toString(36) + "_" + fixSequence;
}

function replaceOnce(source: string, search: string, replacement: string) {
  const occurrences = source.split(search).length - 1;

  if (occurrences !== 1) {
    throw new FixError(
      "The checked-in source no longer matches the safe patch context.",
      "source_context_changed",
      409,
    );
  }

  return source.replace(search, replacement);
}
