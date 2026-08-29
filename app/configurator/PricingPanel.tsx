"use client";

// Live pricing panel — the one piece of the configurator that actually
// reads from Supabase at runtime instead of catalog.ts. Everything else
// (SKU resolution, BOM math) stays exactly as it was: framework-agnostic,
// client-side, unchanged. Pricing is different on purpose, because it's
// the one place role-based access actually matters (see migration
// fix_pricing_tier_role_mapping) — MSRP is public; the 'distributor' tier
// only comes back for a signed-in, approved Distributor/Admin account; the
// 'dealer' tier comes back for Client/Distributor/Admin accounts. Each
// tier that comes back over the wire gets its own total row below.
//
// Static fallback: if the fetch fails outright (network/config issue),
// this renders a plain "temporarily unavailable" note rather than
// crashing or blocking the BOM/parts list, which are unaffected either
// way since they never depended on this data.
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";
import { consolidateParts, consolidatePartsByZone } from "@/lib/configurator/engine";
import type { PartListLine } from "@/lib/configurator/engine";
import type { BomResult } from "@/lib/configurator/types";
import { useTranslations } from "@/app/providers/LocaleProvider";

interface PricingRow {
  product_sku: string;
  tier: string;
  price_cents: number;
  currency: string;
}

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

// A Kitchen Manufacturer typically also does the install and carries more
// of the job (higher markup); a Kitchen Dealer is reselling a more
// turnkey line (lower markup). Both ranges are meant to cover product
// cost, labor, and margin together — not separate line items — applied to
// the viewer's own Dealer-tier cost (see the "estimate" section below).
const BUSINESS_TYPE_MULTIPLIERS: Record<"manufacturer" | "dealer", [number, number]> = {
  manufacturer: [2.5, 3],
  dealer: [1.67, 1.8],
};

export function PricingPanel({ bom }: { bom: BomResult }) {
  const { user } = useSupabaseUser();
  const t = useTranslations();
  const parts = useMemo(() => consolidateParts(bom), [bom]);
  const zoneGroups = useMemo(() => consolidatePartsByZone(bom), [bom]);
  const [rows, setRows] = useState<PricingRow[] | null>(null);
  const [error, setError] = useState(false);
  const [showZonePricing, setShowZonePricing] = useState(false);
  const [showEstimate, setShowEstimate] = useState(false);
  // undefined = not fetched yet, null = signed out or unknown. Business
  // type is a Client-only concept (Distributor/Admin accounts already buy
  // at their own tier, not a "Dealer cost to mark up") — this is what the
  // estimate section below checks before showing the picker or range.
  const [role, setRole] = useState<string | null | undefined>(undefined);
  // undefined = not fetched yet, null = fetched but never set on the
  // account, "manufacturer"/"dealer" = the account's saved choice.
  const [businessType, setBusinessType] = useState<"manufacturer" | "dealer" | null | undefined>(undefined);
  const [savingBusinessType, setSavingBusinessType] = useState(false);
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

  // Loads role + business type together as soon as a signed-in account is
  // known — role has to be known before the estimate section can even
  // decide whether to show the picker or a "Client accounts only" note,
  // so this can't wait on the customer opening that section first the way
  // the old business-type-only fetch did.
  useEffect(() => {
    if (!user || role !== undefined) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("amblux_profiles")
      .select("role, business_type")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setRole(data?.role ?? null);
        const value = data?.business_type;
        setBusinessType(value === "manufacturer" || value === "dealer" ? value : null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, role]);

  // Saves straight to amblux_profiles from the client — RLS ("amblux_profiles
  // are updatable by their owner or by admins") already restricts this to
  // the signed-in account's own row, the same guarantee the /account page's
  // server-action form relies on. Optimistic: the UI switches to the
  // computed range immediately rather than waiting on the write.
  const chooseBusinessType = (value: "manufacturer" | "dealer") => {
    if (!user) return;
    setBusinessType(value);
    setSavingBusinessType(true);
    const supabase = createClient();
    supabase
      .from("amblux_profiles")
      .update({ business_type: value })
      .eq("id", user.id)
      .then(() => setSavingBusinessType(false));
  };

  if (parts.length === 0) return null;

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
        {t("configuratorExtra.pricingUnavailable")}
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
        {t("configuratorExtra.checkingPricing")}
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

  // Same math as totalFor() above, scoped to one zone's own consolidated
  // parts instead of the whole project — powers the "pricing per zone"
  // breakdown.
  const zoneTotalFor = (zoneParts: PartListLine[], tier: string) => {
    let total = 0;
    let pricedCount = 0;
    zoneParts.forEach((p) => {
      const row = bySku.get(p.sku)?.find((r) => r.tier === tier && r.currency === currency);
      if (row) {
        total += row.price_cents * p.qty;
        pricedCount += 1;
      }
    });
    return { total, pricedCount };
  };

  // RLS (migration fix_pricing_tier_role_mapping) decides which tier rows
  // actually come back for the signed-in account: MSRP is always public;
  // 'distributor' only for Distributor/Admin; 'dealer' for
  // Client/Distributor/Admin. So an Admin or Distributor account sees all
  // three totals below, a Client account sees Dealer + MSRP, and a
  // signed-out visitor sees only MSRP.
  const msrp = totalFor("msrp");
  const distributor = totalFor("distributor");
  const dealer = totalFor("dealer");
  const sawAnyPaidPricing = distributor.pricedCount > 0 || dealer.pricedCount > 0;

  if (msrp.pricedCount === 0 && !sawAnyPaidPricing) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
        {t("configuratorExtra.noPricingYet")}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{t("configuratorExtra.pricing")}</h3>
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
        {distributor.pricedCount > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-accent/10 px-4 py-3">
            <span className="text-sm font-medium text-accent-strong">
              {t("configuratorExtra.distributorPrice")}
              {distributor.pricedCount < parts.length ? ` (${distributor.pricedCount}/${parts.length} ${t("configuratorExtra.partsPriced")})` : ""}
            </span>
            <span className="text-sm font-semibold text-accent-strong">
              {formatCents(distributor.total, distributor.currency)}
            </span>
          </div>
        )}

        {dealer.pricedCount > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-accent/10 px-4 py-3">
            <span className="text-sm font-medium text-accent-strong">
              {t("configuratorExtra.dealerPrice")}
              {dealer.pricedCount < parts.length ? ` (${dealer.pricedCount}/${parts.length} ${t("configuratorExtra.partsPriced")})` : ""}
            </span>
            <span className="text-sm font-semibold text-accent-strong">
              {formatCents(dealer.total, dealer.currency)}
            </span>
          </div>
        )}

        {msrp.pricedCount > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-background px-4 py-3">
            <span className="text-sm text-muted">
              {t("configuratorExtra.msrp")}
              {msrp.pricedCount < parts.length ? ` (${msrp.pricedCount}/${parts.length} ${t("configuratorExtra.partsPriced")})` : ""}
            </span>
            <span className="text-sm font-semibold text-foreground">{formatCents(msrp.total, msrp.currency)}</span>
          </div>
        )}

        {!sawAnyPaidPricing ? (
          <p className="text-xs text-muted">
            {user
              ? t("configuratorExtra.distributorPricingUnavailable")
              : t("configuratorExtra.signInToSeePrice")}
          </p>
        ) : null}
      </div>

      {/* Per-product breakdown — the overall totals above answer "what does
          the whole job cost", but a distributor building a quote also
          wants "what does each line item cost" without doing the math
          themselves. One column per tier the viewer can actually see
          (RLS-gated, same as the totals above), each cell showing unit
          price and the extended (qty × unit) price. */}
      {(distributor.pricedCount > 0 || dealer.pricedCount > 0 || msrp.pricedCount > 0) && (
        <div className="mt-6 border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-foreground">{t("configuratorExtra.priceBreakdown")}</h4>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="text-muted">
                  <th className="py-1.5 pr-2 font-medium">{t("configurator.part")}</th>
                  <th className="py-1.5 px-2 text-right font-medium">{t("configurator.qty")}</th>
                  {distributor.pricedCount > 0 && (
                    <th className="py-1.5 px-2 text-right font-medium">{t("configuratorExtra.distributorPrice")}</th>
                  )}
                  {dealer.pricedCount > 0 && (
                    <th className="py-1.5 px-2 text-right font-medium">{t("configuratorExtra.dealerPrice")}</th>
                  )}
                  {msrp.pricedCount > 0 && (
                    <th className="py-1.5 pl-2 text-right font-medium">{t("configuratorExtra.msrp")}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => {
                  const priceIn = (tier: string) =>
                    bySku.get(p.sku)?.find((r) => r.tier === tier && r.currency === currency) ?? null;
                  const distRow = priceIn("distributor");
                  const dealerRow = priceIn("dealer");
                  const msrpRow = priceIn("msrp");
                  const cell = (row: PricingRow | null) =>
                    row ? (
                      <span>
                        {formatCents(row.price_cents * p.qty, row.currency)}
                        <span className="ml-1 text-muted">({formatCents(row.price_cents, row.currency)} ea)</span>
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    );
                  return (
                    <tr key={p.sku} className="border-t border-border/60">
                      <td className="py-1.5 pr-2">
                        <span className="font-medium text-foreground">{p.sku}</span>
                        <span className="block text-muted">{p.description}</span>
                      </td>
                      <td className="py-1.5 px-2 text-right text-foreground">{p.qty}</td>
                      {distributor.pricedCount > 0 && <td className="py-1.5 px-2 text-right text-foreground">{cell(distRow)}</td>}
                      {dealer.pricedCount > 0 && <td className="py-1.5 px-2 text-right text-foreground">{cell(dealerRow)}</td>}
                      {msrp.pricedCount > 0 && <td className="py-1.5 pl-2 text-right text-foreground">{cell(msrpRow)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pricing per zone — an opt-in breakdown (same tier columns as the
          per-product table above, just grouped by zone instead of by SKU)
          for a customer who wants to see what Base Cabinets vs.
          Undercabinet vs. Drawer Lights costs on its own, not just the
          project total. */}
      {(distributor.pricedCount > 0 || dealer.pricedCount > 0 || msrp.pricedCount > 0) && (
        <div className="mt-6 border-t border-border pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={showZonePricing}
              onChange={(e) => setShowZonePricing(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            {t("configuratorExtra.zonePricingQuestion")}
          </label>

          {showZonePricing && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="py-1.5 pr-2 font-medium">{t("configuratorExtra.zoneColumn")}</th>
                    {distributor.pricedCount > 0 && (
                      <th className="py-1.5 px-2 text-right font-medium">{t("configuratorExtra.distributorPrice")}</th>
                    )}
                    {dealer.pricedCount > 0 && (
                      <th className="py-1.5 px-2 text-right font-medium">{t("configuratorExtra.dealerPrice")}</th>
                    )}
                    {msrp.pricedCount > 0 && (
                      <th className="py-1.5 pl-2 text-right font-medium">{t("configuratorExtra.msrp")}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {zoneGroups.map((group) => {
                    const zDist = zoneTotalFor(group.parts, "distributor");
                    const zDealer = zoneTotalFor(group.parts, "dealer");
                    const zMsrp = zoneTotalFor(group.parts, "msrp");
                    const cell = (zoneTotal: { total: number; pricedCount: number }) =>
                      zoneTotal.pricedCount > 0 ? formatCents(zoneTotal.total, currency) : <span className="text-muted">—</span>;
                    return (
                      <tr key={group.zone} className="border-t border-border/60">
                        <td className="py-1.5 pr-2 font-medium text-foreground">{group.zone}</td>
                        {distributor.pricedCount > 0 && <td className="py-1.5 px-2 text-right text-foreground">{cell(zDist)}</td>}
                        {dealer.pricedCount > 0 && <td className="py-1.5 px-2 text-right text-foreground">{cell(zDealer)}</td>}
                        {msrp.pricedCount > 0 && <td className="py-1.5 pl-2 text-right text-foreground">{cell(zMsrp)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Estimated total job price for the lighting portion of the job —
          Dealer-tier cost (what every approved account pays AMBLUX)
          marked up by a range appropriate to the account's own business
          type, saved once on their profile so this doesn't have to be
          re-asked on every project. */}
      <div className="mt-6 border-t border-border pt-4">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={showEstimate}
            onChange={(e) => setShowEstimate(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          {t("configuratorExtra.estimateQuestion")}
        </label>

        {showEstimate && (
          <div className="mt-3 rounded-lg bg-background p-4 text-sm">
            {!user ? (
              <p className="text-muted">{t("configuratorExtra.signInForEstimate")}</p>
            ) : role === undefined ? (
              <p className="text-muted">{t("configuratorExtra.checkingPricing")}</p>
            ) : role !== "client" ? (
              <p className="text-muted">{t("configuratorExtra.estimateClientOnly")}</p>
            ) : dealer.pricedCount === 0 ? (
              <p className="text-muted">{t("configuratorExtra.estimateNeedsDealerPricing")}</p>
            ) : businessType === undefined ? (
              <p className="text-muted">{t("configuratorExtra.checkingPricing")}</p>
            ) : businessType === null ? (
              <div>
                <p className="text-foreground">{t("configuratorExtra.chooseBusinessType")}</p>
                <p className="mt-1 text-xs text-muted">{t("configuratorExtra.businessTypeSaveNote")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => chooseBusinessType("manufacturer")}
                    className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent-strong"
                  >
                    {t("configuratorExtra.kitchenManufacturer")}
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseBusinessType("dealer")}
                    className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent-strong"
                  >
                    {t("configuratorExtra.kitchenDealer")}
                  </button>
                </div>
              </div>
            ) : (
              (() => {
                const [lowMult, highMult] = BUSINESS_TYPE_MULTIPLIERS[businessType];
                const low = dealer.total * lowMult;
                const high = dealer.total * highMult;
                const typeLabel = t(
                  businessType === "manufacturer" ? "configuratorExtra.kitchenManufacturer" : "configuratorExtra.kitchenDealer"
                );
                return (
                  <div>
                    <p className="text-xs text-muted">{t("configuratorExtra.estimateIntro")}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {t("configuratorExtra.estimatedJobTotal")}: {formatCents(low, dealer.currency)} – {formatCents(high, dealer.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {t("configuratorExtra.estimateBasedOn")
                        .replace("{cost}", formatCents(dealer.total, dealer.currency))
                        .replace("{type}", typeLabel)}
                    </p>
                    {/* Both types are always shown, the active one visually
                        marked — clicking the other one switches (and saves)
                        directly, instead of a generic "Change" link that had
                        to reset back to the two-button picker above first. */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(["manufacturer", "dealer"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => chooseBusinessType(type)}
                          disabled={savingBusinessType || type === businessType}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-default ${
                            type === businessType
                              ? "border-accent bg-accent/10 text-accent-strong"
                              : "border-border text-muted hover:border-accent hover:text-accent-strong"
                          }`}
                        >
                          {t(type === "manufacturer" ? "configuratorExtra.kitchenManufacturer" : "configuratorExtra.kitchenDealer")}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
