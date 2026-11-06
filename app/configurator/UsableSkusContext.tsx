"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { CONFIGURATOR_USABLE_STATUSES, type UsableSkuInfo, type UsableSkuSnapshot } from "@/lib/configurator/availability";

const UsableSkusContext = createContext<UsableSkuSnapshot>(null);

// Fetched once per configurator session (on mount) — same "fetch
// client-side, fail open on error" pattern ProductPricing.tsx already uses
// for live pricing. Not re-fetched on every render or every keystroke:
// product status changes at business speed (an admin flips a dropdown),
// not customer-click speed, so a customer who has the wizard open across a
// status change picks it up on their next visit/reload, same as every
// other live-data read already in this app.
export function UsableSkusProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<UsableSkuSnapshot>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    // A SKU is gated on two independent status fields that live on two
    // different tables: its own amblux_products.status (the per-SKU
    // dropdown on /admin/products/<slug>/<sku>) AND its parent product
    // page's amblux_product_pages.status (the page-level dropdown on
    // /admin/products/<slug>, and the quick-change control added straight
    // to the /admin/products list). Hiding/backordering the *page* is how
    // an admin pulls an entire product — every SKU on it — out of
    // circulation in one action (e.g. setting "Wireless Sensor Switches"
    // to Hidden), and the configurator needs to honor that exactly like it
    // honors a single SKU's own status. Without this, a page-level hide
    // silently did nothing here even though it already hid the page at
    // /products/<slug> — the SKU itself was still "active" and kept
    // showing up in the wizard.
    Promise.all([
      supabase.from("amblux_products").select("sku, status, page_slug"),
      supabase.from("amblux_product_pages").select("slug, status"),
    ]).then(([productsRes, pagesRes]) => {
      if (cancelled) return;
      const { data: products, error: productsError } = productsRes;
      if (productsError || !products) return; // fail open — snapshot stays null, every filter treats that as "show everything" (see availability.ts)

      // The page fetch fails open independently of the product fetch: if
      // it errors, page status simply isn't used to gate anything (every
      // SKU falls back to being judged on its own status alone) rather
      // than the whole snapshot being discarded over a second query.
      const { data: pages, error: pagesError } = pagesRes;
      const pageStatusBySlug = new Map<string, string>();
      if (!pagesError && pages) {
        for (const pg of pages) pageStatusBySlug.set(pg.slug, pg.status);
      }

      const info: UsableSkuInfo = {
        known: new Set(products.map((p) => p.sku)),
        usable: new Set(
          products
            .filter((p) => {
              if (!(CONFIGURATOR_USABLE_STATUSES as readonly string[]).includes(p.status)) return false;
              const pageStatus = p.page_slug ? pageStatusBySlug.get(p.page_slug) : undefined;
              if (pageStatus === undefined) return true; // no page row found (or page fetch failed) — fail open on this dimension
              return (CONFIGURATOR_USABLE_STATUSES as readonly string[]).includes(pageStatus);
            })
            .map((p) => p.sku),
        ),
      };
      setSnapshot(info);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <UsableSkusContext.Provider value={snapshot}>{children}</UsableSkusContext.Provider>;
}

export function useUsableSkus(): UsableSkuSnapshot {
  return useContext(UsableSkusContext);
}
