"use client";

import { useMemo, useState } from "react";

type Props = {
  defaults?: Record<string, number>;
  // The SKU's FOB cost (USD) — when known, each margin field grows a
  // paired "target price" input so the admin can type either side:
  // AMBLUX margin % (→ Distributor price), Distributor margin %
  // (→ Dealer price), or Dealer margin % (→ MSRP). Editing one recomputes
  // the other live, entirely client-side — nothing is saved until the
  // surrounding form's Save/Add override button is clicked, and prices
  // only go live on the site after Recalculate & publish.
  fobUsd?: number;
  // When this fieldset is rendered outside its owning <form> (see
  // NewOverrideForm), pass that form's id so the cost/margin inputs below
  // still submit with it via the HTML `form` attribute instead of DOM
  // nesting. Leave undefined when rendered as a normal <form> descendant.
  formId?: string;
};

const COST_FIELD_LABELS: Record<string, string> = {
  freight_usd: "Freight (USD/unit)",
  insurance_usd: "Insurance (USD/unit)",
  brokerage_usd: "Brokerage (USD/unit)",
  duty_pct: "Duty (%)",
  inland_cad: "Inland freight (CAD/unit)",
  qc_pct: "QC buffer (%)",
  fx_usd_cad: "FX rate (USD→CAD)",
};
const COST_FIELDS = Object.keys(COST_FIELD_LABELS);

type MarginKey = "amblux_margin_pct" | "distributor_margin_pct" | "dealer_margin_pct";

const MARGIN_STEPS: { key: MarginKey; marginLabel: string; priceLabel: string }[] = [
  { key: "amblux_margin_pct", marginLabel: "AMBLUX margin (%)", priceLabel: "→ Distributor price (CAD)" },
  { key: "distributor_margin_pct", marginLabel: "Distributor margin (%)", priceLabel: "→ Dealer price (CAD)" },
  { key: "dealer_margin_pct", marginLabel: "Dealer margin (%)", priceLabel: "→ MSRP (CAD)" },
];

// Mirrors the SQL in amblux_recalculate_pricing() exactly, so the live
// preview here matches what publishing will actually produce.
function computeChain(fobUsd: number, v: Record<string, number>) {
  const freightDocs = v.freight_usd + v.insurance_usd + v.brokerage_usd;
  const duty = fobUsd * v.duty_pct;
  const subtotal = fobUsd + freightDocs + duty;
  const landedUsd = subtotal * (1 + v.qc_pct);
  const landedCad = landedUsd * v.fx_usd_cad + v.inland_cad;
  const distributorCad = landedCad / (1 - v.amblux_margin_pct);
  const dealerCad = distributorCad / (1 - v.distributor_margin_pct);
  const msrpCad = dealerCad / (1 - v.dealer_margin_pct);
  return { landedCad, distributorCad, dealerCad, msrpCad };
}

// Inverts price = basis / (1 - margin) to margin = 1 - basis/price.
// Clamped to 0–95%: a target at or below cost can't be hit with a
// positive margin, so we floor at 0 rather than produce a negative or
// runaway margin from a typo.
function marginForPrice(basis: number, price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return Math.min(0.95, Math.max(0, 1 - basis / price));
}

export function SkuMarginFieldset({ defaults, fobUsd, formId }: Props) {
  const [values, setValues] = useState<Record<string, number>>(() => ({
    freight_usd: defaults?.freight_usd ?? 0,
    insurance_usd: defaults?.insurance_usd ?? 0,
    brokerage_usd: defaults?.brokerage_usd ?? 0,
    duty_pct: defaults?.duty_pct ?? 0,
    inland_cad: defaults?.inland_cad ?? 0,
    qc_pct: defaults?.qc_pct ?? 0,
    fx_usd_cad: defaults?.fx_usd_cad ?? 1,
    amblux_margin_pct: defaults?.amblux_margin_pct ?? 0,
    distributor_margin_pct: defaults?.distributor_margin_pct ?? 0,
    dealer_margin_pct: defaults?.dealer_margin_pct ?? 0,
  }));
  // Raw text currently being typed into a price field, kept separate from
  // the derived numeric display so a half-typed value like "112." doesn't
  // get overwritten before the admin finishes.
  const [priceDrafts, setPriceDrafts] = useState<Partial<Record<MarginKey, string>>>({});

  const chain = useMemo(() => (fobUsd != null ? computeChain(fobUsd, values) : null), [fobUsd, values]);
  const priceBasis: Record<MarginKey, number | null> = {
    amblux_margin_pct: chain ? chain.landedCad : null,
    distributor_margin_pct: chain ? chain.distributorCad : null,
    dealer_margin_pct: chain ? chain.dealerCad : null,
  };
  const priceResult: Record<MarginKey, number | null> = {
    amblux_margin_pct: chain ? chain.distributorCad : null,
    distributor_margin_pct: chain ? chain.dealerCad : null,
    dealer_margin_pct: chain ? chain.msrpCad : null,
  };

  function setField(name: string, value: number) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handlePriceInput(key: MarginKey, raw: string) {
    setPriceDrafts((prev) => ({ ...prev, [key]: raw }));
    const basis = priceBasis[key];
    const typed = Number(raw);
    if (basis == null || raw.trim() === "" || Number.isNaN(typed)) return;
    setField(key, marginForPrice(basis, typed));
  }

  function handlePriceBlur(key: MarginKey) {
    setPriceDrafts((prev) => ({ ...prev, [key]: undefined }));
  }

  return (
    <div className="flex flex-col gap-4">
      {fobUsd ? (
        <div className="flex w-fit flex-col gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted">
          FOB (USD)
          <span className="text-sm font-semibold text-foreground">${fobUsd.toFixed(2)}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COST_FIELDS.map((field) => (
          <label key={field} className="flex flex-col gap-1 text-xs text-muted">
            {COST_FIELD_LABELS[field]}
            <input
              form={formId}
              type="number"
              step="0.0001"
              name={field}
              value={values[field]}
              onChange={(e) => setField(field, Number(e.target.value))}
              required
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        ))}
      </div>

      {!fobUsd ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Enter a SKU that already has a FOB cost on file (see the Product cost table below) to edit by target
          price — for now you can still set raw margin percentages below.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {MARGIN_STEPS.map(({ key, marginLabel, priceLabel }) => {
          const result = priceResult[key];
          const draft = priceDrafts[key];
          const priceValue = draft ?? (result != null ? result.toFixed(2) : "");
          return (
            <div key={key} className="flex flex-col gap-2 rounded-xl border border-border/60 p-3">
              <label className="flex flex-col gap-1 text-xs text-muted">
                {marginLabel}
                <input
                  form={formId}
                  type="number"
                  step="0.0001"
                  name={key}
                  value={values[key]}
                  onChange={(e) => setField(key, Number(e.target.value))}
                  required
                  className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                {priceLabel}
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  disabled={!fobUsd}
                  value={priceValue}
                  onChange={(e) => handlePriceInput(key, e.target.value)}
                  onBlur={() => handlePriceBlur(key)}
                  placeholder={fobUsd ? undefined : "needs a known SKU"}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
            </div>
          );
        })}
      </div>
      {fobUsd ? (
        <p className="text-xs text-muted">
          Type either side of a pair — a margin percentage or a target price — and the other updates to match.
          Prices are CAD, computed live from this SKU&apos;s FOB cost (${fobUsd.toFixed(2)} USD) and the fields
          above. Nothing is saved until you click Save / Add override below, and it only goes live on the site
          after Recalculate &amp; publish.
        </p>
      ) : null}
    </div>
  );
}
