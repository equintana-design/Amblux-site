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
// SKU variant. RLS (migration 0027_fix_pricing_tier_role_mapping, then
// 0033_pricing_requires_auth) decides which tier rows actually come back
// over the wire — as of 2026-09, every tier (MSRP included) requires a
// signed-in account, per the user's explicit "if you're not signed in,
// you can't see any pricing" request; 'distributor' is further restricted
// to Distributor/Admin accounts, 'dealer' to Client/Distributor/Admin.
// So an Admin or Distributor account sees all three (Distributor, Dealer,
// MSRP), a Client account sees two (Dealer, MSRP), and any signed-in
// account not yet in either of those groups (or still pending approval)
// sees MSRP only — a signed-out visitor now sees nothing at all rather
// than falling back to MSRP. This component just renders whichever rows
// are present — it doesn't decide entitlement itself.
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

  // Checked first, before the loading/error states below, so a signed-out
  // visitor sees one clear message immediately rather than a "Checking
  // pricing…" flash that resolves into it a moment later. No approval
  // requirement here — just being signed in is enough to clear this gate,
  // exactly as before this change for MSRP; only the Distributor/Dealer
  // tiers still depend on role/approval, via RLS, unchanged.
  if (!user) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-background p-5 text-sm text-muted">
        {t("configuratorExtra.signInToSeePrice")}
      </div>
    );
  }

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
  const distributor = forTier("distributor");
  const dealer = forTier("dealer");
  const anyPaidTier = Boolean(distributor || dealer);

  if (!msrp && !anyPaidTier) {
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
        {distributor ? (
          <div className="flex items-center justify-between rounded-lg bg-accent/10 px-4 py-3">
            <span className="text-sm font-medium text-accent-strong">{t("configuratorExtra.distributorPrice")}</span>
            <span className="text-sm font-semibold text-accent-strong">
              {formatCents(distributor.price_cents, distributor.currency)}
            </span>
          </div>
        ) : null}

        {dealer ? (
          <div className="flex items-center justify-between rounded-lg bg-accent/10 px-4 py-3">
            <span className="text-sm font-medium text-accent-strong">{t("configuratorExtra.dealerPrice")}</span>
            <span className="text-sm font-semibold text-accent-strong">
              {formatCents(dealer.price_cents, dealer.currency)}
            </span>
          </div>
        ) : null}

        {msrp ? (
          <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
            <span className="text-sm text-muted">{t("configuratorExtra.msrp")}</span>
            <span className="text-sm font-semibold text-foreground">{formatCents(msrp.price_cents, msrp.currency)}</span>
          </div>
        ) : null}

        {/* user is guaranteed truthy here — the !user case returns early above */}
        {!anyPaidTier ? <p className="text-xs text-muted">{t("configuratorExtra.distributorPricingUnavailable")}</p> : null}
      </div>
    </div>
  );
}
