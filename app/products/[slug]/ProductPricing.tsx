"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";
import { useTranslations } from "@/app/providers/LocaleProvider";
import { useVariant } from "./VariantState";

interface PricingRow {
  tier: string;
  price_cents: number;
  currency: string;
}

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

// Mirrors the configurator's PricingPanel (see its own header comment for
// the full RLS story) but for a single product page's currently-selected
// SKU variant. MSRP is always public; whichever paid tier the signed-in
// account's role is actually entitled to — 'distributor' or 'dealer', see
// migration fix_pricing_tier_role_mapping — comes back over the wire on
// its own and is shown generically as "Your price". A signed-out visitor
// or an account still pending admin approval only ever sees MSRP.
export function ProductPricing() {
  const { selectedSku } = useVariant();
  const { user } = useSupabaseUser();
  const t = useTranslations();
  const [rows, setRows] = useState<PricingRow[] | null>(null);
  const [error, setError] = useState(false);
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("amblux_pricing")
      .select("tier, price_cents, currency")
      .eq("product_sku", selectedSku)
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
  }, [selectedSku]);

  if (error) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-background p-5 text-sm text-muted">
        {t("configuratorExtra.pricingUnavailable")}
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-background p-5 text-sm text-muted">
        {t("configuratorExtra.checkingPricing")}
      </div>
    );
  }

  const forTier = (tier: string) => rows.find((r) => r.tier === tier && r.currency === currency);
  const msrp = forTier("msrp");
  // Prefer 'distributor' if it came back (the better price, only granted
  // to Distributor/Admin roles); otherwise fall back to 'dealer' (a
  // Client account's own price). RLS is what actually decides which of
  // these rows exist for the current signed-in user — this just displays
  // whichever one shows up.
  const yourPrice = forTier("distributor") ?? forTier("dealer");

  if (!msrp && !yourPrice) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-background p-5 text-sm text-muted">
        {t("configuratorExtra.noPricingYet")}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">
          {t("configuratorExtra.pricing")}
        </p>
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
        {msrp ? (
          <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
            <span className="text-sm text-muted">{t("configuratorExtra.msrp")}</span>
            <span className="text-sm font-semibold text-foreground">{formatCents(msrp.price_cents, msrp.currency)}</span>
          </div>
        ) : null}

        {yourPrice ? (
          <div className="flex items-center justify-between rounded-lg bg-accent/10 px-4 py-3">
            <span className="text-sm font-medium text-accent-strong">{t("configuratorExtra.yourDistributorPrice")}</span>
            <span className="text-sm font-semibold text-accent-strong">
              {formatCents(yourPrice.price_cents, yourPrice.currency)}
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted">
            {user ? t("configuratorExtra.distributorPricingUnavailable") : t("configuratorExtra.signInToSeePrice")}
          </p>
        )}
      </div>
    </div>
  );
}
