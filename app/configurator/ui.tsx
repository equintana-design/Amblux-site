"use client";

import { useState, type ReactNode } from "react";
import type { BomRow, Unit } from "@/lib/configurator/types";

// `required` just renders a red asterisk after the label — a visual cue,
// not a native HTML `required` attribute (this wizard has no single
// <form> to submit, so browser-native required validation has nothing to
// hook into). The actual enforcement is the Save-time check in
// useSaveQuote.ts, which reuses the exact same three fields.
export function Field({ label, children, wide, required }: { label: string; children: ReactNode; wide?: boolean; required?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="font-medium text-muted">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

const controlClass =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function Select({
  value,
  onChange,
  options,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  // Same red-border validation cue the required text inputs on
  // ProjectInfoStep.tsx already use — e.g. the Application select, which is
  // now a required field (see ProjectInfoStep.tsx).
  invalid?: boolean;
}) {
  return (
    <select
      className={`${controlClass} ${invalid ? "border-red-300" : ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// Parses a length-style text value that may be a whole number, a decimal
// (e.g. "1.2"), a simple fraction (e.g. "3/4", "1/2"), or a mixed number
// ("1 1/2" or "1-1/2" — both separators are real-world conventions for
// inches/feet). Returns null for anything that doesn't (yet) parse to a
// usable number, including a still-in-progress fragment like "1 " or
// "1/" — the caller leaves the field's live value alone in that case
// rather than guessing, same anti-clamp-while-typing reasoning as the
// digits-only mode below.
function parseLengthText(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;

  const mixed = trimmed.match(/^(\d+)[\s-]+(\d+)\/(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    if (denominator === 0) return null;
    return Number(mixed[1]) + Number(mixed[2]) / denominator;
  }

  const fraction = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }

  if (/^\d*\.?\d*$/.test(trimmed) && trimmed !== ".") {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

// Every character an in-progress decimal, fraction, or mixed-number
// fragment can legitimately contain (e.g. "1", "1.", "1 1/", "1-1/2") —
// permissive on purpose, since parseLengthText() above is what actually
// validates the result; this just decides what's allowed into the buffer
// at all while typing.
const LENGTH_TEXT_PATTERN = /^[0-9\s./-]*$/;

// Rounded before redisplaying so a repeating fraction (e.g. 1/3) doesn't
// come back from a commit as "0.3333333333333333".
function formatLengthValue(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  unit,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  // Optional hard cap — e.g. Closet Hangers/Shoe Rack's shelf count (see
  // catalog.ts's MAX_SHELVES_BY_ZONE). Clamped when the field is committed
  // (see below), not on every keystroke, so a value can actually be typed.
  max?: number;
  // Pass the field's current display unit to accept more than whole
  // numbers: "m"/"cm" accept plain decimals ("1.2"); "in"/"ft" additionally
  // accept real fraction notation ("1/2", "3/4") and mixed numbers
  // ("1 1/2", "1-1/2") — the notations people actually use for those two
  // units. Fractions/decimals are parsed to plain decimal internally
  // (parseLengthText above) and redisplayed as decimal on blur; nothing
  // about the app's internal unit representation changes. Omit entirely
  // for a plain whole-number count field (shelves, drawer count, zone
  // count, puck spacing step, etc.) to keep the original digits-only
  // behaviour exactly as it was.
  unit?: Unit;
}) {
  const allowsFraction = unit === "in" || unit === "ft";
  const allowsDecimal = allowsFraction || unit === "m" || unit === "cm";

  // A plain, always-typable text field rather than the browser's native
  // type="number" spinner. Confirmed directly by the user that the
  // spinner-style input (with its up/down arrow buttons) wasn't usable for
  // typing a value in — with a fully-controlled type="number" input that
  // clamps to min/max on every keystroke, typing a two-digit number like
  // "10" against e.g. a max of 4 would snap back to "4" the instant the "1"
  // made the field temporarily read a value over the cap, before the "0"
  // could even be typed — effectively making the field untypeable for
  // anything but single digits. This keeps its own local text buffer while
  // the customer is typing (so an in-progress keystroke — an empty field, a
  // value that's momentarily out of range or not yet a complete fraction —
  // is never immediately overwritten) and only clamps to min/max when the
  // field loses focus.
  const [raw, setRaw] = useState(String(value));
  // Tracks the last `value` this input has already reconciled against, so
  // the buffer can be re-synced during render (React's recommended pattern
  // for "adjust state when a prop changes") instead of in a useEffect —
  // avoids an extra post-commit render and the cascading-render lint rule.
  const [lastSeenValue, setLastSeenValue] = useState(value);
  if (value !== lastSeenValue) {
    setLastSeenValue(value);
    // Only actually overwrite the buffer when it doesn't already match —
    // e.g. `value` just changed because typing "1/2" itself pushed a new
    // value up to the parent; the buffer already reads "1/2" and shouldn't
    // be clobbered back to a stale decimal rendering of that same number.
    const currentParsed = allowsDecimal ? parseLengthText(raw) : Number(raw);
    if (currentParsed !== value) setRaw(allowsDecimal ? formatLengthValue(value) : String(value));
  }

  const clamp = (n: number) => {
    let next = allowsDecimal ? n : Math.round(n);
    if (max !== undefined && next > max) next = max;
    if (next < min) next = min;
    return next;
  };

  return (
    <input
      type="text"
      inputMode={allowsFraction ? "text" : allowsDecimal ? "decimal" : "numeric"}
      className={controlClass}
      value={raw}
      onChange={(e) => {
        const text = e.target.value;
        if (allowsDecimal) {
          // Anything outside the permissive character set is simply
          // ignored (the field just doesn't change), matching how the
          // digits-only mode below already behaves.
          if (!LENGTH_TEXT_PATTERN.test(text)) return;
          setRaw(text);
          const parsed = parseLengthText(text);
          // Deliberately NOT clamped here, and left entirely uncommitted
          // while `text` is still an incomplete fraction/decimal (parsed
          // === null) — see the comment above.
          if (parsed !== null) onChange(parsed);
          return;
        }
        // Only digits are ever kept in the buffer — this is a count field,
        // never negative or fractional, in this app. Anything else typed is
        // simply ignored (the field just doesn't change) rather than
        // surfacing an error, matching how a plain number field behaves.
        if (!/^\d*$/.test(text)) return;
        setRaw(text);
        if (text !== "") {
          const parsed = Number(text);
          // Deliberately NOT clamped here — see the comment above. A value
          // that's momentarily over/under range while still being typed is
          // passed straight through so the rest of the app stays live and
          // in sync as the customer types; clamping only happens on blur.
          if (Number.isFinite(parsed)) onChange(parsed);
        }
      }}
      onBlur={() => {
        if (allowsDecimal) {
          const parsed = parseLengthText(raw);
          const next = parsed === null ? min : clamp(parsed);
          onChange(next);
          setRaw(formatLengthValue(next));
          return;
        }
        const parsed = Number(raw);
        const next = raw.trim() === "" || !Number.isFinite(parsed) ? min : clamp(parsed);
        onChange(next);
        setRaw(String(next));
      }}
    />
  );
}

export function ReadOnly({ value }: { value: string }) {
  return <div className={`${controlClass} bg-background text-muted`}>{value}</div>;
}

export function Textarea({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      className={`${controlClass} resize-y`}
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-border accent-[var(--accent)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

// Small numeric up/down stepper for the editable-BOM-quantity feature
// (BomSummaryStep.tsx) — deliberately buttons, not a free-text field, per
// spec ("numeric, not free text"). Shows an inline "reset to suggested"
// link whenever the current value has actually been overridden away from
// the computed one, matching the existing includeInstallBracket-style
// opt-out affordances elsewhere in the wizard.
export function QtyStepper({
  value,
  suggested,
  min = 0,
  onChange,
  onReset,
  resetLabel,
}: {
  value: number;
  /** The computed (non-overridden) quantity — shown only to decide whether to offer the reset link. */
  suggested: number;
  min?: number;
  onChange: (value: number) => void;
  onReset: () => void;
  resetLabel: string;
}) {
  const isOverridden = value !== suggested;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-6 w-6 items-center justify-center rounded border border-white/30 text-white transition-colors hover:border-white hover:bg-white/10"
        >
          −
        </button>
        <span className="w-6 text-center font-medium text-white">{value}</span>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => onChange(value + 1)}
          className="flex h-6 w-6 items-center justify-center rounded border border-white/30 text-white transition-colors hover:border-white hover:bg-white/10"
        >
          +
        </button>
      </div>
      {isOverridden ? (
        <button type="button" onClick={onReset} className="text-[10px] text-accent-soft underline-offset-2 hover:underline">
          {resetLabel}
        </button>
      ) : null}
    </div>
  );
}

export function Section({
  title,
  description,
  headerRight,
  children,
}: {
  title: string;
  description?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {headerRight}
      </div>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Wizard chrome — step tab strip, the dark "zones to include" sidebar
// tracker, and the inline "AMBLUX calculated solution" preview cards shown
// under each cabinet/drawer row. See app/configurator/ConfiguratorClient.tsx
// for how these compose into the 9-step wizard shell.
// ---------------------------------------------------------------------

export interface WizardStep {
  key: string;
  label: string;
  /** Present only for the 7 zone steps — used to decide the ✓ badge. */
  done?: boolean;
}

export function StepTabs({
  steps,
  activeKey,
  onSelect,
}: {
  steps: WizardStep[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-border bg-surface px-6 py-4">
      {steps.map((step, i) => {
        const active = step.key === activeKey;
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onSelect(step.key)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
              active
                ? "border-foreground bg-foreground text-white"
                : "border-border bg-surface text-muted hover:border-accent hover:text-accent-strong"
            }`}
          >
            {i + 1}. {step.label}
            {step.done ? <span className="ml-1" aria-hidden="true">✓</span> : null}
          </button>
        );
      })}
    </nav>
  );
}

export function ZoneSidebar({
  kicker,
  heading,
  zones,
  emptyMessage,
  summaryLabel,
  activeKey,
  onSelectZone,
  onJumpToSummary,
}: {
  kicker: string;
  heading: string;
  zones: { key: string; label: string; included: boolean }[];
  /** Shown instead of the zone list when this project type has no built zones yet. */
  emptyMessage?: string;
  summaryLabel: string;
  activeKey: string;
  onSelectZone: (key: string) => void;
  onJumpToSummary: () => void;
}) {
  return (
    <div className="rounded-2xl bg-foreground p-6 text-white lg:sticky lg:top-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft">{kicker}</p>
      <p className="mt-3 text-sm font-semibold text-white">{heading}</p>
      {zones.length === 0 && emptyMessage ? <p className="mt-3 text-sm text-white/70">{emptyMessage}</p> : null}
      <ul className="mt-3 flex flex-col">
        {zones.map((z) => (
          <li key={z.key} className="border-t border-white/10 first:border-t-0">
            <button
              type="button"
              onClick={() => onSelectZone(z.key)}
              className={`w-full py-2 text-left text-sm transition-colors ${
                z.key === activeKey ? "text-white" : "text-white/70 hover:text-white"
              }`}
            >
              <span aria-hidden="true" className={z.included ? "text-accent-soft" : "text-white/40"}>
                {z.included ? "✓" : "○"}
              </span>{" "}
              {z.label}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onJumpToSummary}
        className="mt-4 w-full rounded-lg bg-accent-soft px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent-strong hover:text-white"
      >
        {summaryLabel}
      </button>
    </div>
  );
}

export function CalculatedSolution({ heading, title, rows }: { heading: string; title: string; rows: BomRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="sm:col-span-2 rounded-xl border border-accent-soft/50 bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-strong">{heading}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{title}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {rows.map((row, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-3 text-xs">
            <p className="text-muted">{row.zone}</p>
            <p className="mt-1 text-foreground">{row.description}</p>
            <p className="mt-1 font-semibold text-foreground">
              {row.qty} × {row.sku}
            </p>
            {row.notes ? <p className="mt-1 text-muted">{row.notes}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
