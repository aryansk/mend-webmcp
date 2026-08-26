import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-page">
      <span className="micro-label">MEND / 404</span>
      <h1>That workspace does not exist.</h1>
      <p>Start from the Mend landing page and open a new audit workspace.</p>
      <Link className="primary-button" href="/">
        Return home
        <ArrowIcon />
      </Link>
    </main>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
