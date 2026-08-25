"use client";

import { useMemo, useState } from "react";
import { FobEditForm } from "./FobEditForm";
import { ParamFieldset } from "./ParamFieldset";
import { SkuMarginFieldset } from "./SkuMarginFieldset";

type Cost = { fob_usd: number; is_estimated: boolean; notes: string | null };
type Product = { sku: string; category: string | null; label: string | null };

type Props = {
  action: (formData: FormData) => void;
  fobBySku: Record<string, number>;
  costBySku: Record<string, Cost>;
  updateCostAction: (formData: FormData) => void;
  addCostAction: (formData: FormData) => void;
  products: Product[];
  globalDefaults?: Record<string, number>;
  initialScope: "category" | "sku";
  initialScopeKey: string;
  openInitially: boolean;
};

type Suggestion = { type: "sku" | "category"; value: string; sublabel: string };

const MAX_SUGGESTIONS = 8;

// Wraps the "+ Add a new override" form as a client component so the
// Scope/SKU fields can be watched live: switching Scope to "SKU" and
// typing a known SKU swaps in SkuMarginFieldset's target-price calculator
// in place of the plain margin-percentage inputs, and also surfaces a
// live FOB editor for that SKU. The "Category name or SKU" field also
// drives a substring-match suggestion dropdown (searches every product's
// SKU and category, not just prefixes) so typing part of a SKU number —
// not necessarily the start of it — still finds it.
export function NewOverrideForm({
  action,
  fobBySku,
  costBySku,
  updateCostAction,
  addCostAction,
  products,
  globalDefaults,
  initialScope,
  initialScopeKey,
  openInitially,
}: Props) {
  const [scope, setScope] = useState<"category" | "sku">(initialScope);
  const [scopeKey, setScopeKey] = useState(initialScopeKey);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const trimmedKey = scopeKey.trim();
  const fobUsd = scope === "sku" ? fobBySku[trimmedKey] : undefined;

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) if (p.category) seen.add(p.category);
    return Array.from(seen);
  }, [products]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const query = trimmedKey.toLowerCase();
    if (query.length < 2) return [];

    const skuMatches: Suggestion[] = products
      .filter((p) => p.sku.toLowerCase().includes(query))
      .slice(0, MAX_SUGGESTIONS)
      .map((p) => ({ type: "sku", value: p.sku, sublabel: p.label ?? p.category ?? "" }));

    const categoryMatches: Suggestion[] = categories
      .filter((c) => c.toLowerCase().includes(query))
      .slice(0, 4)
      .map((c) => ({ type: "category", value: c, sublabel: "category" }));

    return [...categoryMatches, ...skuMatches].slice(0, MAX_SUGGESTIONS);
  }, [products, categories, trimmedKey]);

  function pickSuggestion(s: Suggestion) {
    setScope(s.type);
    setScopeKey(s.value);
    setShowSuggestions(false);
  }

  return (
    <details className="mt-6" open={openInitially}>
      <summary className="cursor-pointer text-sm font-medium text-accent-strong">+ Add a new override</summary>
      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border p-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Scope
            <select
              form="new-override-form"
              name="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as "category" | "sku")}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="category">Category</option>
              <option value="sku">SKU</option>
            </select>
          </label>
          <div className="relative flex flex-1 flex-col gap-1">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Category name or SKU
              <input
                form="new-override-form"
                type="text"
                name="scope_key"
                required
                autoComplete="off"
                value={scopeKey}
                onChange={(e) => {
                  setScopeKey(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setShowSuggestions(false)}
                placeholder="e.g. linear_piece or AMB-DRV-24V-96W — type any part of it"
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>
            {showSuggestions && suggestions.length > 0 ? (
              <ul className="absolute top-full z-10 mt-1 w-full max-w-sm overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                {suggestions.map((s) => (
                  <li key={`${s.type}-${s.value}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSuggestion(s)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-foreground hover:bg-background"
                    >
                      <span className="font-mono text-xs">{s.value}</span>
                      <span className="truncate text-xs text-muted">
                        {s.type === "category" ? "category" : s.sublabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {/* FobEditForm renders its own independent <form> (a different
            action entirely — the product-cost table, not pricing
            parameters) — kept as a sibling here, never nested inside
            another <form>, since a <form> inside a <form> is invalid HTML
            and silently breaks whichever one the browser decides not to
            honour. That nesting bug is exactly what made "Save FOB" look
            like it did nothing here before this fix. */}
        {scope === "sku" && trimmedKey ? (
          <FobEditForm
            key={trimmedKey}
            sku={trimmedKey}
            cost={costBySku[trimmedKey]}
            updateAction={updateCostAction}
            addAction={addCostAction}
          />
        ) : null}

        {/* The actual "Add override" form has no visible children of its
            own — every field it submits (scope, scope_key, and every
            margin field inside SkuMarginFieldset/ParamFieldset below)
            points at it via the HTML `form="new-override-form"`
            attribute instead of DOM nesting, which is what keeps this
            whole section a flat list of sibling forms rather than forms
            stacked inside forms. */}
        <form id="new-override-form" action={action} />

        {scope === "sku" ? (
          <SkuMarginFieldset key={`margin-${trimmedKey}`} formId="new-override-form" defaults={globalDefaults} fobUsd={fobUsd} />
        ) : (
          <ParamFieldset formId="new-override-form" defaults={globalDefaults} />
        )}
        <button
          type="submit"
          form="new-override-form"
          className="w-fit rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          Add override
        </button>
      </div>
    </details>
  );
}
