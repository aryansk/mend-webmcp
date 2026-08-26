export default function FeaturesPage() {
  return (
    <main>
      <header className="page-header">
        <p className="eyebrow">Features</p>
        <h1>Build with confidence</h1>
      </header>
      <section className="features">
        <div className="feature-grid">
          <article>
            <h3>Human approval</h3>
            <p>Review every proposed source change before it lands.</p>
          </article>
          <article>
            <h3>Verified outcomes</h3>
            <p>Run the audit again and compare what actually changed.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
