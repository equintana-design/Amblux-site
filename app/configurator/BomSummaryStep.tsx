"use client";

// The dark "AMBLUX calculated solution" sheet shown on the wizard's final
// step (see ConfiguratorClient.tsx) — the zone-grouped BOM plus the
// Print/PDF and Share-by-email actions, following the exact
// window.print() / mailto: pattern already established in
// app/products/[slug]/ProductHero.tsx (handlePrint/handleShare).
//
// Pricing was added here on top of that: one unit-price column per tier
// the viewer can see, plus a job-total bar per tier next to the existing
// Total watts bar. This is a second, independent pricing fetch from
// PricingPanel.tsx (which sits lower on the page and has its own
// CAD/USD toggle, zone breakdown, and job-cost estimate) — this card
// stays CAD-only and unit-price-only on purpose, as a compact,
// at-a-glance summary rather than a duplicate of the full panel. RLS
// (migration fix_pricing_tier_role_mapping) still decides which tier
// rows actually come back for the signed-in account, same as everywhere
// else pricing is shown: MSRP is always public, 'distributor' only for
// Distributor/Admin, 'dealer' for Client/Distributor/Admin.
import { Fragment, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { consolidateParts, groupBom } from "@/lib/configurator/engine";
import type { BomResult, ProjectInfo } from "@/lib/configurator/types";
import { useTranslations } from "@/app/providers/LocaleProvider";

interface PricingRow {
  product_sku: string;
  tier: string;
  price_cents: number;
  currency: string;
}

const PRICING_CURRENCY = "CAD";

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function BomSummaryStep({ bom, project }: { bom: BomResult; project: ProjectInfo }) {
  const t = useTranslations();
  const groups = groupBom(bom);
  const parts = useMemo(() => consolidateParts(bom), [bom]);
  const skuKey = parts.map((p) => p.sku).join(",");
  const title = project.name || t("configuratorExtra.defaultProjectTitle");

  const [rows, setRows] = useState<PricingRow[] | null>(null);
  const [pricingError, setPricingError] = useState(false);

  useEffect(() => {
    if (parts.length === 0) {
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("amblux_pricing")
      .select("product_sku, tier, price_cents, currency")
      .in("product_sku", parts.map((p) => p.sku))
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setPricingError(true);
          setRows(null);
          return;
        }
        setPricingError(false);
        setRows(data ?? []);
      });
    return () => {
      cancelled = true;
    };
    // parts is rebuilt every render from the BOM; key off the SKU list so
    // this only re-fetches when the actual set of parts changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuKey]);

  const bySku = new Map<string, PricingRow[]>();
  (rows ?? []).forEach((r) => {
    const list = bySku.get(r.product_sku) ?? [];
    list.push(r);
    bySku.set(r.product_sku, list);
  });

  const priceIn = (sku: string, tier: string) =>
    bySku.get(sku)?.find((r) => r.tier === tier && r.currency === PRICING_CURRENCY) ?? null;

  const totalFor = (tier: string) => {
    let total = 0;
    let pricedCount = 0;
    parts.forEach((p) => {
      const row = priceIn(p.sku, tier);
      if (row) {
        total += row.price_cents * p.qty;
        pricedCount += 1;
      }
    });
    return { total, pricedCount };
  };

  const distributor = totalFor("distributor");
  const dealer = totalFor("dealer");
  const msrp = totalFor("msrp");
  const showDistributor = distributor.pricedCount > 0;
  const showDealer = dealer.pricedCount > 0;
  const showMsrp = msrp.pricedCount > 0;
  const showAnyPricing = !pricingError && rows !== null && (showDistributor || showDealer || showMsrp);
  const priceColumnCount = (showDistributor ? 1 : 0) + (showDealer ? 1 : 0) + (showMsrp ? 1 : 0);

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  function handleShare() {
    const subject = encodeURIComponent(t("configuratorExtra.bomEmailSubject"));
    const lines = [
      `${t("configuratorExtra.bomEmailIntro")} ${title}.`,
      "",
      `${t("configurator.totalWatts")}: ${Math.round(bom.total * 10) / 10} W`,
      "",
      t("configuratorExtra.bomEmailAttach"),
    ];
    const body = encodeURIComponent(lines.join("\n"));
    if (typeof window !== "undefined") window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-2 sm:p-4 print:border-0 print:p-0">
      <div className="rounded-xl bg-foreground p-6 text-white sm:p-8 print:rounded-none">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft">{t("configurator.calculate")}</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>

        {bom.rows.length === 0 ? (
          <p className="mt-6 text-sm text-white/70">{t("configurator.empty")}</p>
        ) : (
          <>
            <div className="mt-5 flex items-center justify-between rounded-lg bg-white/10 px-4 py-3 text-sm">
              <span className="text-white/80">{t("configurator.totalWatts")}</span>
              <span className="font-semibold text-white">{Math.round(bom.total * 10) / 10} W</span>
            </div>

            {showAnyPricing && (
              <div className="mt-2 flex flex-col gap-2">
                {showDistributor && (
                  <div className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3 text-sm">
                    <span className="text-white/80">{t("configuratorExtra.distributorPrice")}</span>
                    <span className="font-semibold text-white">{formatCents(distributor.total, PRICING_CURRENCY)}</span>
                  </div>
                )}
                {showDealer && (
                  <div className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3 text-sm">
                    <span className="text-white/80">{t("configuratorExtra.dealerPrice")}</span>
                    <span className="font-semibold text-white">{formatCents(dealer.total, PRICING_CURRENCY)}</span>
                  </div>
                )}
                {showMsrp && (
                  <div className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3 text-sm">
                    <span className="text-white/80">{t("configuratorExtra.msrp")}</span>
                    <span className="font-semibold text-white">{formatCents(msrp.total, PRICING_CURRENCY)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-white/60">
                  <tr>
                    <th className="py-2 pr-3">{t("configurator.qty")}</th>
                    <th className="py-2">{t("configurator.part")}</th>
                    {showDistributor && (
                      <th className="py-2 pl-3 text-right">
                        {t("configuratorExtra.distributorPrice")}
                        <span className="block normal-case text-[10px] tracking-normal text-white/40">
                          {t("configuratorExtra.unitPriceLabel")}
                        </span>
                      </th>
                    )}
                    {showDealer && (
                      <th className="py-2 pl-3 text-right">
                        {t("configuratorExtra.dealerPrice")}
                        <span className="block normal-case text-[10px] tracking-normal text-white/40">
                          {t("configuratorExtra.unitPriceLabel")}
                        </span>
                      </th>
                    )}
                    {showMsrp && (
                      <th className="py-2 pl-3 text-right">
                        {t("configuratorExtra.msrp")}
                        <span className="block normal-case text-[10px] tracking-normal text-white/40">
                          {t("configuratorExtra.unitPriceLabel")}
                        </span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <Fragment key={group.zone}>
                      <tr className="border-t border-accent-soft/40">
                        <td
                          colSpan={2 + priceColumnCount}
                          className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-accent-soft"
                        >
                          {group.zone}
                        </td>
                      </tr>
                      {group.rows.map((row, i) => {
                        const cell = (priced: PricingRow | null) =>
                          priced ? (
                            <span className="text-white">{formatCents(priced.price_cents, priced.currency)}</span>
                          ) : (
                            <span className="text-white/40">—</span>
                          );
                        return (
                          <tr key={i} className="border-t border-white/10 align-top">
                            <td className="py-2 pr-3 font-medium text-white">{row.qty}</td>
                            <td className="py-2">
                              <div className="font-mono text-xs text-accent-soft">{row.sku}</div>
                              <div className="text-white/80">{row.description}</div>
                              {row.notes ? <div className="text-xs text-white/50">{row.notes}</div> : null}
                            </td>
                            {showDistributor && <td className="py-2 pl-3 text-right">{cell(priceIn(row.sku, "distributor"))}</td>}
                            {showDealer && <td className="py-2 pl-3 text-right">{cell(priceIn(row.sku, "dealer"))}</td>}
                            {showMsrp && <td className="py-2 pl-3 text-right">{cell(priceIn(row.sku, "msrp"))}</td>}
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-xs text-white/60 print:hidden">{t("configurator.electrical")}</p>

            <button
              type="button"
              onClick={handlePrint}
              className="mt-4 w-full rounded-lg bg-accent-soft px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent-strong hover:text-white print:hidden"
            >
              {t("configurator.print")}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="mt-3 w-full text-center text-sm font-semibold text-white/80 transition-colors hover:text-white print:hidden"
            >
              {t("configurator.emailShare")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
