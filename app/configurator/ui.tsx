"use client";

import type { ReactNode } from "react";
import type { BomRow } from "@/lib/configurator/types";

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="font-medium text-muted">{label}</span>
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
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select className={controlClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      className={controlClass}
      value={value}
      min={min}
      step={step}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
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
  summaryLabel,
  activeKey,
  onSelectZone,
  onJumpToSummary,
}: {
  kicker: string;
  heading: string;
  zones: { key: string; label: string; included: boolean }[];
  summaryLabel: string;
  activeKey: string;
  onSelectZone: (key: string) => void;
  onJumpToSummary: () => void;
}) {
  return (
    <div className="rounded-2xl bg-foreground p-6 text-white lg:sticky lg:top-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft">{kicker}</p>
      <p className="mt-3 text-sm font-semibold text-white">{heading}</p>
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
