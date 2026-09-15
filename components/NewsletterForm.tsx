"use client";

import { useState, FormEvent } from "react";

// Demo only — POST to a real newsletter service in production.
export default function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <form className="newsletter-form" onSubmit={handleSubmit} id="subscribe">
      <input
        type="email"
        placeholder="your.email@example.com"
        aria-label="Email address"
        required
        disabled={submitted}
      />
      <button type="submit" disabled={submitted}>
        {submitted ? "Subscribed ✓" : "Subscribe for free"}
      </button>
      <span className="fineprint">Unsubscribe anytime, one click.</span>
    </form>
  );
}
