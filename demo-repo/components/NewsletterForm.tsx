export function NewsletterForm() {
  return (
    <form className="newsletter">
      <p>Get practical website repair notes.</p>
      <div className="newsletter-row">
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          className="newsletter-input"
        />
        <button type="submit">Subscribe</button>
      </div>
    </form>
  );
}
