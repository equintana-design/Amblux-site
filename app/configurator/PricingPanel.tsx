"use client";

// Live pricing panel — the one piece of the configurator that actually
// reads from Supabase at runtime instead of catalog.ts. Everything else
// (SKU resolution, BOM math) stays exactly as it was: framework-agnostic,
// client-side, unchanged. Pricing is different on purpose, because it's
// the one place role-based access actually matters (see amblux_pricing's
// RLS policies in migrations/0001) — msrp is public, distributor pricing
// only comes back over the wire for a signed-in, approved distributor.
//
// Static fallback: if the fetch fails outright (network/config issue),
// this renders a plain "temporarily unavailable" note rather than
// crashing or blocking the BOM/parts list, which are unaffected either
// way since they never depended on this data.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";
import type { PartListLine } from "@/lib/configurator/engine";

interface PricingRow {
  product_sku: string;
  tier: string;
  price_cents: number;
  currency: string;
}

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function PricingPanel({ parts }: { parts: PartListLine[] }) {
  const { user } = useSupabaseUser();
  const [rows, setRows] = useState<PricingRow[] | null>(null);
  const [error, setError] = useState(false);
  // Every tier now publishes both a CAD and a USD row (the pricing engine
  // computes CAD from the landed-cost ladder, then converts to USD by a
  // straight FX rate) — pick one explicitly rather than letting
  // `.find(r => r.tier === tier)` grab whichever currency happens to come
  // back first. CAD is the default since that's still the business's
  // primary pricing currency; USD is one click away.
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const skuKey = parts.map((p) => p.sku).join(",");

  useEffect(() => {
    // No setState here for the empty case — the component already
    // renders null when parts.length === 0 (see below), so there's
    // nothing to visibly sync; calling setRows() synchronously as the
    // first thing in the effect body just trips React's
    // set-state-in-effect check for no benefit.
    if (parts.length === 0) {
      return;
    }
    // Clearing a stale error from a previous fetch happens inside the
    // async callback below (on success), not synchronously here — same
    // set-state-in-effect reasoning as the empty-parts case above.
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("amblux_pricing")
      .select("product_sku, tier, price_cents, currency")
      .in("product_sku", parts.map((p) => p.sku))
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
    // parts is rebuilt every render from the BOM; key off the SKU list so
    // this only re-fetches when the actual set of parts changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuKey]);

  if (parts.length === 0) return null;

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
        Live pricing is temporarily unavailable. Part numbers and quantities above are unaffected.
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
        Checking current pricing…
      </div>
    );
  }

  const bySku = new Map<string, PricingRow[]>();
  rows.forEach((r) => {
    const list = bySku.get(r.product_sku) ?? [];
    list.push(r);
    bySku.set(r.product_sku, list);
  });

  const totalFor = (tier: string) => {
    let total = 0;
    let pricedCount = 0;
    parts.forEach((p) => {
      const row = bySku.get(p.sku)?.find((r) => r.tier === tier && r.currency === currency);
      if (row) {
        total += row.price_cents * p.qty;
        pricedCount += 1;
      }
    });
    return { total, pricedCount, currency };
  };

  const msrp = totalFor("msrp");
  const distributor = totalFor("distributor");
  const sawDistributorPricing = distributor.pricedCount > 0;

  if (msrp.pricedCount === 0 && !sawDistributorPricing) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
        Pricing hasn&apos;t been published for these parts yet — the parts list above is already the real
        calculated order list.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Pricing</h3>
        <div className="flex overflow-hidden rounded-full border border-border text-xs font-semibold">
          {(["CAD", "USD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 transition-colors ${
                currency === c ? "bg-accent text-white" : "text-muted hover:text-accent-strong"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {msrp.pricedCount > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-background px-4 py-3">
            <span className="text-sm text-muted">
              MSRP{msrp.pricedCount < parts.length ? ` (${msrp.pricedCount}/${parts.length} parts priced)` : ""}
            </span>
            <span className="text-sm font-semibold text-foreground">{formatCents(msrp.total, msrp.currency)}</span>
          </div>
        )}

        {sawDistributorPricing ? (
          <div className="flex items-center justify-between rounded-lg bg-accent/10 px-4 py-3">
            <span className="text-sm font-medium text-accent-strong">
              Your distributor price
              {distributor.pricedCount < parts.length ? ` (${distributor.pricedCount}/${parts.length} parts priced)` : ""}
            </span>
            <span className="text-sm font-semibold text-accent-strong">
              {formatCents(distributor.total, distributor.currency)}
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted">
            {user
              ? "Distributor pricing isn't visible on this account yet — an admin needs to approve it first."
              : "Sign in as an approved distributor to see your buy price."}
          </p>
        )}
      </div>
    </div>
  );
}
