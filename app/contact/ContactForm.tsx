"use client";

import { useState } from "react";

const SALES_EMAIL = "sales@amblux.com";

// No backend email service is wired up yet, so this uses the same
// mailto: pattern already used elsewhere on the site (see ProductHero's
// "email spec sheet" button) — Send opens the visitor's own email app
// with the message addressed to sales@amblux.com and pre-filled, rather
// than submitting silently to a server. Simple, no new infrastructure,
// and the visitor still reviews the message before it actually sends.
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Website contact form${name ? ` — ${name}` : ""}`);
    const body = encodeURIComponent(
      [`Name: ${name || "—"}`, `Email: ${email || "—"}`, `Phone: ${phone || "—"}`, "", comment || ""].join("\n"),
    );
    window.location.href = `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Email *</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted">Phone number</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted">Comment</span>
        <textarea
          rows={5}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </label>
      <button
        type="submit"
        className="w-fit rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
      >
        Send
      </button>
      <p className="text-xs text-muted">
        Clicking Send opens your email app with this message addressed to {SALES_EMAIL} — review it there and hit
        send.
      </p>
    </form>
  );
}
