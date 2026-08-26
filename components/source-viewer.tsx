"use client";

import { Code2, GitBranch, ShieldCheck, X } from "./icons";
import type {
  RepositoryConnection,
  RepositorySourceView,
} from "../lib/repository/types";

export function SourceViewer({
  repository,
  source,
  onClose,
}: {
  repository: RepositoryConnection;
  source: RepositorySourceView;
  onClose: () => void;
}) {
  const lines = source.content.split("\n");
  const contextStart = Math.max(1, source.lineStart - 3);
  const contextEnd = Math.min(lines.length, source.lineEnd + 3);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="source-viewer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-viewer-title"
      >
        <div className="source-viewer-header">
          <div>
            <span className="micro-label">CONNECTED SOURCE · READ ONLY</span>
            <h2 id="source-viewer-title">Inspect source</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close source viewer"
          >
            <X width={18} height={18} />
          </button>
        </div>

        <div className="source-viewer-summary">
          <span className="patch-file-icon">
            <Code2 width={16} height={16} />
          </span>
          <span>
            <strong>{source.filePath}</strong>
            <small>
              {repository.fullName} · {repository.branch}
            </small>
          </span>
          <span className="confidence-badge">
            {Math.round(source.confidence * 100)}% match
          </span>
        </div>

        <div className="source-viewer-proof">
          <ShieldCheck width={14} height={14} />
          <span>{source.reason}</span>
          <span className="source-viewer-lines">
            Lines {source.lineStart}–{source.lineEnd}
          </span>
        </div>

        <div className="source-code-panel">
          <div className="source-code-toolbar">
            <span>
              <GitBranch width={13} height={13} />
              {repository.fullName}
            </span>
            <span>read-only snapshot</span>
          </div>
          <div className="source-code-lines">
            {lines.slice(contextStart - 1, contextEnd).map((line, index) => {
              const lineNumber = contextStart + index;
              const isMappedLine =
                lineNumber >= source.lineStart && lineNumber <= source.lineEnd;

              return (
                <div
                  className={
                    "source-code-line " +
                    (isMappedLine ? "source-code-line-mapped" : "")
                  }
                  key={lineNumber}
                >
                  <span>{lineNumber}</span>
                  <code>{line || " "}</code>
                </div>
              );
            })}
          </div>
        </div>

        <div className="source-viewer-footer">
          <span>Source changes remain unavailable until the apply phase.</span>
          <button className="secondary-button" type="button" onClick={onClose}>
            Close viewer
          </button>
        </div>
      </section>
    </div>
  );
}
