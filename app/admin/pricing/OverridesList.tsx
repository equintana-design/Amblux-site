"use client";

// Accordion for existing category/SKU pricing overrides. Previously every
// override in this list rendered permanently expanded (full FOB + margin
// editors, all at once) — fine with one or two overrides, unreadable once
// several SKUs had custom margins. Now each row starts collapsed to a
// one-line summary; clicking "Edit" opens just that row (and closes
// whichever other row was open, since there's only one `openId`), and
// clicking Save collapses it again via the form's onSubmit — the server
// action still runs normally (onSubmit doesn't call preventDefault), this
// just also updates the client-side open/closed state at the same time.
import { useState } from "react";
import { FobEditForm } from "./FobEditForm";
import { ParamFieldset } from "./ParamFieldset";
import { SkuMarginFieldset } from "./SkuMarginFieldset";

type Cost = { fob_usd: number; is_estimated: boolean; notes: string | null };
type Override = {
  id: string;
  scope: string;
  scope_key: string | null;
  [key: string]: unknown;
};

export function OverridesList({
  overrides,
  costBySku,
  fobBySku,
  upsertAction,
  deleteAction,
  updateCostAction,
  addCostAction,
  initialOpenKey,
}: {
  overrides: Override[];
  costBySku: Record<string, Cost>;
  fobBySku: Record<string, number>;
  upsertAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  updateCostAction: (formData: FormData) => void;
  addCostAction: (formData: FormData) => void;
  initialOpenKey?: string;
}) {
  // Deep-linked from the Product cost table's "Edit margin →" link
  // (?override_sku=SKU#overrides) — if that SKU already has an override,
  // open its row directly instead of leaving every row collapsed.
  const [openId, setOpenId] = useState<string | null>(
    () => overrides.find((o) => o.scope_key === initialOpenKey)?.id ?? null
  );

  if (overrides.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-3">
      {overrides.map((o) => {
        const open = o.id === openId;
        return (
          <div key={o.id} className="rounded-xl border border-border">
            <div className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm font-medium text-foreground">
                {o.scope === "category" ? "Category" : "SKU"}: <span className="font-mono">{o.scope_key}</span>
              </p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : o.id)}
                  className="text-xs font-semibold text-accent-strong hover:underline"
                >
                  {open ? "Close" : "Edit"}
                </button>
                <form action={deleteAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <button type="submit" className="text-xs font-medium text-muted hover:text-red-600">
                    Remove override
                  </button>
                </form>
              </div>
            </div>

            {open && (
              <div className="flex flex-col gap-3 border-t border-border p-4">
                {o.scope === "sku" ? (
                  <FobEditForm
                    sku={o.scope_key ?? ""}
                    cost={costBySku[o.scope_key ?? ""]}
                    updateAction={updateCostAction}
                    addAction={addCostAction}
                  />
                ) : null}
                <form action={upsertAction} onSubmit={() => setOpenId(null)} className="flex flex-col gap-3">
                  <input type="hidden" name="scope" value={o.scope} />
                  <input type="hidden" name="scope_key" value={o.scope_key ?? ""} />
                  {o.scope === "sku" ? (
                    <SkuMarginFieldset defaults={o as unknown as Record<string, number>} fobUsd={fobBySku[o.scope_key ?? ""]} />
                  ) : (
                    <ParamFieldset defaults={o as unknown as Record<string, number>} />
                  )}
                  <button
                    type="submit"
                    className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
                  >
                    Save
                  </button>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
