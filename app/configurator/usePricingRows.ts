"use client";

// Small shared piece of the live-pricing fetch also used (independently)
// inside PricingPanel.tsx. Pulled out here so PartsList.tsx's CSV export
// can attach real unit/total pricing to each line without duplicating the
// Supabase query shape or re-deriving "which tier is this viewer's real
// cost" logic. PricingPanel keeps its own richer, already-verified fetch
// (it needs every tier, broken out separately, plus a CAD/USD toggle) —
// this hook is the lighter-weight version for a plain CSV export.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PricingRow {
  product_sku: string;
  tier: string;
  price_cents: number;
  currency: string;
}

export function usePricingRows(skus: string[]): { rows: PricingRow[] | null; error: boolean } {
  const [rows, setRows] = useState<PricingRow[] | null>(null);
  const [error, setError] = useState(false);
  const skuKey = skus.join(",");

  useEffect(() => {
    if (skus.length === 0) {
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("amblux_pricing")
      .select("product_sku, tier, price_cents, currency")
      .in("product_sku", skus)
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(true);
          setRows(null);
          return;
        }
        setError(false);
        setRows(data ?? []);
      });
    return () => {
      cancelled = true;
    };
    // skus is rebuilt every render from the BOM; key off the joined SKU
    // list so this only re-fetches when the actual set of parts changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuKey]);

  return { rows, error };
}

// Picks "the price this viewer would actually pay" for one SKU: Dealer
// tier if they can see it (every approved account can), else Distributor
// tier (Distributor/Admin only), else MSRP (always public). Returns null
// if none of those tiers came back for this SKU in the given currency —
// RLS not returning a tier at all (vs. the tier simply having no row for
// this SKU) looks identical from here, and both mean "nothing to show".
export function bestTierPrice(
  rows: PricingRow[] | null,
  sku: string,
  currency: "CAD" | "USD" = "CAD"
): { tier: string; price_cents: number } | null {
  if (!rows) return null;
  const forSku = rows.filter((r) => r.product_sku === sku && r.currency === currency);
  for (const tier of ["dealer", "distributor", "msrp"]) {
    const row = forSku.find((r) => r.tier === tier);
    if (row) return { tier, price_cents: row.price_cents };
  }
  return null;
}
