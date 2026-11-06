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
    supabase
      .from("amblux_products")
      .select("sku, status")
      .then(({ data, error }) => {
        if (cancelled || error || !data) return; // fail open — snapshot stays null, every filter treats that as "show everything" (see availability.ts)
        const info: UsableSkuInfo = {
          known: new Set(data.map((p) => p.sku)),
          usable: new Set(data.filter((p) => (CONFIGURATOR_USABLE_STATUSES as readonly string[]).includes(p.status)).map((p) => p.sku)),
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
