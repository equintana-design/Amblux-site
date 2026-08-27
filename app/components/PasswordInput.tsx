"use client";

// Password <input> with a Show/Hide toggle — used on sign-in and
// update-password so people can double-check what they typed before
// submitting, instead of guessing from a row of dots.
import { useId, useState } from "react";

export function PasswordInput({
  label,
  name,
  minLength,
  autoComplete,
}: {
  label: string;
  name: string;
  minLength?: number;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-muted">{label}</span>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          name={name}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-16 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-muted hover:text-accent-strong"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
