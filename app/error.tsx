"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <span className="micro-label">MEND / RECOVERABLE ERROR</span>
      <h1>That workspace needs a refresh.</h1>
      <p>
        Mend could not render this view. Your source is untouched, and you can
        safely try the page again.
      </p>
      <button className="primary-button" type="button" onClick={() => reset()}>
        Reload workspace
      </button>
    </main>
  );
}
