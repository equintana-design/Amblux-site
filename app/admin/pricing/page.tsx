import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addProductCostAction,
  deleteScopedParametersAction,
  recalculatePricingAction,
  updateGlobalParametersAction,
  updateProductCostAction,
  upsertScopedParametersAction,
} from "./actions";

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

function ParamFieldset({ defaults }: { defaults?: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {PARAM_FIELDS.map((field) => (
        <label key={field} className="flex flex-col gap-1 text-xs text-muted">
          {FIELD_LABELS[field]}
          <input
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

export default async function AdminPricingPage({
  searchParams,
}: {
  searchParams: Promise<{ recalc_ok?: string; recalc_error?: string }>;
}) {
  const { recalc_ok, recalc_error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: myProfile } = await supabase.from("amblux_profiles").select("role, approved").eq("id", user.id).single();
  if (!myProfile || myProfile.role !== "admin" || !myProfile.approved) redirect("/account");

  const [{ data: params }, { data: costs }, { data: products }] = await Promise.all([
    supabase.from("amblux_pricing_parameters").select("*").order("scope"),
    supabase.from("amblux_product_cost").select("*").order("sku"),
    supabase.from("amblux_products").select("sku, category, label").order("sku"),
  ]);

  const global = (params ?? []).find((p) => p.scope === "global");
  const overrides = (params ?? []).filter((p) => p.scope !== "global");
  const productBySku = new Map((products ?? []).map((p) => [p.sku, p]));
  const costedSkus = new Set((costs ?? []).map((c) => c.sku));
  const uncostedProducts = (products ?? []).filter((p) => p.sku !== "AMB-APP" && !costedSkus.has(p.sku));

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Admin</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Pricing engine</h1>
      <p className="mt-2 text-sm text-muted">
        Prices are computed from product cost (FOB) through a landed-cost ladder — freight, duty, and QC buffer to
        get landed cost, then AMBLUX / distributor / dealer margins stacked on top to get distributor price, dealer
        price, and MSRP. USD prices are a straight FX conversion of the computed CAD ladder. Nothing below changes a
        live price until you click <strong>Recalculate &amp; publish</strong> — edits to cost or parameters are
        saved immediately but only take effect on the site once recalculated.
      </p>

      {/* --- Recalculate --- */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Publish</h2>
            <p className="mt-1 text-sm text-muted">
              Recomputes every priced SKU from current cost + parameters and publishes CAD and USD prices for
              distributor, dealer, and MSRP tiers.
            </p>
          </div>
          <form action={recalculatePricingAction}>
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              Recalculate &amp; publish prices
            </button>
          </form>
        </div>
        {recalc_ok && (
          <p className="mt-4 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
            Published prices for {recalc_ok} SKUs.
          </p>
        )}
        {recalc_error && (
          <p className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700">
            Recalculation failed: {recalc_error}
          </p>
        )}
      </section>

      {/* --- Global parameters --- */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Global parameters</h2>
        <p className="mt-1 text-sm text-muted">
          Applies to every SKU unless a category or SKU override below matches first.
        </p>
        {global ? (
          <form action={updateGlobalParametersAction} className="mt-4 flex flex-col gap-4">
            <ParamFieldset defaults={global as unknown as Record<string, number>} />
            <button
              type="submit"
              className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
            >
              Save global parameters
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted">No global parameter row found — this shouldn&apos;t happen.</p>
        )}
      </section>

      {/* --- Category / SKU overrides --- */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Category &amp; SKU overrides</h2>
        <p className="mt-1 text-sm text-muted">
          A SKU-scoped override wins over a category-scoped one, which wins over global. Each override replaces the
          whole parameter set for that scope — there&apos;s no partial merge with global.
        </p>

        {overrides.length > 0 && (
          <div className="mt-4 flex flex-col gap-4">
            {overrides.map((o) => (
              <div key={o.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {o.scope === "category" ? "Category" : "SKU"}: <span className="font-mono">{o.scope_key}</span>
                  </p>
                  <form action={deleteScopedParametersAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <button type="submit" className="text-xs font-medium text-muted hover:text-red-600">
                      Remove override
                    </button>
                  </form>
                </div>
                <form action={upsertScopedParametersAction} className="mt-3 flex flex-col gap-3">
                  <input type="hidden" name="scope" value={o.scope} />
                  <input type="hidden" name="scope_key" value={o.scope_key ?? ""} />
                  <ParamFieldset defaults={o as unknown as Record<string, number>} />
                  <button
                    type="submit"
                    className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
                  >
                    Save
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-accent-strong">+ Add a new override</summary>
          <form action={upsertScopedParametersAction} className="mt-4 flex flex-col gap-4 rounded-xl border border-border p-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex flex-col gap-1 text-xs text-muted">
                Scope
                <select
                  name="scope"
                  className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="category">Category</option>
                  <option value="sku">SKU</option>
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
                Category name or SKU
                <input
                  type="text"
                  name="scope_key"
                  required
                  placeholder="e.g. linear_piece or AMB-DRV-24V-96W"
                  className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </label>
            </div>
            <ParamFieldset defaults={global as unknown as Record<string, number>} />
            <button
              type="submit"
              className="w-fit rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              Add override
            </button>
          </form>
        </details>
      </section>

      {/* --- Product cost --- */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Product cost (FOB)</h2>
        <p className="mt-1 text-sm text-muted">
          The cost basis every SKU&apos;s price is built from. Rows flagged <strong>estimated</strong> were
          back-calculated from the old manual price list rather than a real supplier quote — replace them with a
          real FOB as soon as one is available. AMBLUX-APP is a free software feature and is intentionally excluded
          here (it&apos;s hardcoded to $0 everywhere).
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">FOB (USD)</th>
                <th className="py-2 pr-3">Estimated?</th>
                <th className="py-2 pr-3">Notes</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(costs ?? []).map((c) => {
                const product = productBySku.get(c.sku);
                return (
                  <tr key={c.sku} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3 font-mono text-xs">{c.sku}</td>
                    <td className="py-2 pr-3 text-xs text-muted">{product?.category ?? "—"}</td>
                    <td className="py-2 pr-3" colSpan={4}>
                      <form action={updateProductCostAction} className="flex flex-wrap items-center gap-3">
                        <input type="hidden" name="sku" value={c.sku} />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="fob_usd"
                          defaultValue={c.fob_usd}
                          className="w-24 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-muted">
                          <input type="checkbox" name="is_estimated" defaultChecked={c.is_estimated} />
                          estimated
                        </label>
                        <input
                          type="text"
                          name="notes"
                          defaultValue={c.notes ?? ""}
                          placeholder="notes"
                          className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted hover:border-accent hover:text-accent-strong"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {uncostedProducts.length > 0 && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              {uncostedProducts.length} SKU{uncostedProducts.length === 1 ? "" : "s"} with no cost on file — no price
              is published for these until a FOB is added:
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {uncostedProducts.map((p) => (
                <form key={p.sku} action={addProductCostAction} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="sku" value={p.sku} />
                  <span className="font-mono text-xs text-amber-900">{p.sku}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="fob_usd"
                    placeholder="FOB (USD)"
                    required
                    className="w-28 rounded-lg border border-amber-300 bg-white px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Add cost
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
