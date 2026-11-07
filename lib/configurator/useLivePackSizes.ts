"use client";

// Live `pack_size` lookup for computeBom() — 2026-11-06, direct owner
// instruction ("Make it so I can choose the pack multiplier") after the
// first pass of the sub-$1 "sell in packs" feature used a hardcoded
// SUBDOLLAR_PACK_SIZE=5 constant. Pack size per SKU now lives on
// amblux_product_cost.pack_size (admin-editable on each SKU's admin page —
// see app/admin/products/[slug]/[sku]/page.tsx), and this hook is the one
// place that fetches it for client-side computeBom() callers.
//
// Same "fetch once on mount, fail open on error" shape as
// app/configurator/UsableSkusContext.tsx: a plain hook rather than a
// context, since (unlike usable-SKU status, which many form dropdowns each
// need independently) only the one computeBom() call site per
// surface — ConfiguratorClient.tsx, ChatWidget.tsx — needs this value, so
// there's no tree of descendants to thread a context through.
//
// Returns null until the first fetch resolves (or forever, on error) — see
// catalog.ts's packedQty() for how a null/missing map here still produces
// correct behaviour via its static SUBDOLLAR_PACK_SKUS fallback, it just
// won't reflect an owner's edited pack size until this resolves.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useLivePackSizes(): ReadonlyMap<string, number> | null {
  const [sizes, setSizes] = useState<ReadonlyMap<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("amblux_product_cost")
      .select("sku, pack_size")
      .gt("pack_size", 1)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setSizes(new Map(data.map((row) => [row.sku as string, row.pack_size as number])));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return sizes;
}
