const FIELD_LABELS: Record<string, string> = {
  freight_usd: "Freight (USD/unit)",
  insurance_usd: "Insurance (USD/unit)",
  brokerage_usd: "Brokerage (USD/unit)",
  duty_pct: "Duty (%)",
  inland_cad: "Inland freight (CAD/unit)",
  qc_pct: "QC buffer (%)",
  fx_usd_cad: "FX rate (USD→CAD)",
  amblux_margin_pct: "AMBLUX margin (%)",
  distributor_margin_pct: "Distributor margin (%)",
  dealer_margin_pct: "Dealer margin (%)",
};
const PARAM_FIELDS = Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>;
const PCT_FIELDS = new Set(["duty_pct", "qc_pct", "amblux_margin_pct", "distributor_margin_pct", "dealer_margin_pct"]);

// Plain margin-percentage editor — used for global parameters and for
// category-scoped overrides, where there's no single SKU/FOB cost to
// preview a resulting price against. For SKU-scoped overrides, see
// SkuMarginFieldset instead, which adds a live target-price calculator
// next to each margin field.
//
// formId: when this fieldset is rendered outside its owning <form> (see
// NewOverrideForm, which keeps its "Add override" <form> empty and
// element-less to avoid nesting it with FobEditForm's own separate
// <form>), pass the form's id here so every input still submits with it
// via the HTML `form` attribute. Leave undefined when this is rendered
// as a normal descendant of its <form> — an input's `form` attribute is
// optional and it just submits with its nearest ancestor form as usual.
export function ParamFieldset({ defaults, formId }: { defaults?: Record<string, number>; formId?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {PARAM_FIELDS.map((field) => (
        <label key={field} className="flex flex-col gap-1 text-xs text-muted">
          {FIELD_LABELS[field]}
          <input
            form={formId}
            type="number"
            step="0.0001"
            name={field}
            defaultValue={defaults?.[field] ?? (PCT_FIELDS.has(field) ? 0 : undefined)}
            required
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
      ))}
    </div>
  );
}
