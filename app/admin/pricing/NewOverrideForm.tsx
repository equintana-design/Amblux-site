"use client";

import { useState } from "react";
import { ParamFieldset } from "./ParamFieldset";
import { SkuMarginFieldset } from "./SkuMarginFieldset";

type Props = {
  action: (formData: FormData) => void;
  fobBySku: Record<string, number>;
  globalDefaults?: Record<string, number>;
  initialScope: "category" | "sku";
  initialScopeKey: string;
  openInitially: boolean;
};

// Wraps the "+ Add a new override" form as a client component so the
// Scope/SKU fields can be watched live: switching Scope to "SKU" and
// typing a known SKU swaps in SkuMarginFieldset's target-price calculator
// in place of the plain margin-percentage inputs.
export function NewOverrideForm({ action, fobBySku, globalDefaults, initialScope, initialScopeKey, openInitially }: Props) {
  const [scope, setScope] = useState<"category" | "sku">(initialScope);
  const [scopeKey, setScopeKey] = useState(initialScopeKey);
  const fobUsd = scope === "sku" ? fobBySku[scopeKey.trim()] : undefined;

  return (
    <details className="mt-6" open={openInitially}>
      <summary className="cursor-pointer text-sm font-medium text-accent-strong">+ Add a new override</summary>
      <form action={action} className="mt-4 flex flex-col gap-4 rounded-xl border border-border p-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Scope
            <select
              name="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as "category" | "sku")}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="category">Category</option>
              <option value="sku">SKU</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
            Category name or SKU
            <input
              type="text"
              name="scope_key"
              required
              value={scopeKey}
              onChange={(e) => setScopeKey(e.target.value)}
              placeholder="e.g. linear_piece or AMB-DRV-24V-96W"
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        </div>
        {scope === "sku" ? (
          <SkuMarginFieldset defaults={globalDefaults} fobUsd={fobUsd} />
        ) : (
          <ParamFieldset defaults={globalDefaults} />
        )}
        <button
          type="submit"
          className="w-fit rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          Add override
        </button>
      </form>
    </details>
  );
}
