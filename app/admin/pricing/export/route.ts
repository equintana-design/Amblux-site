// GET /admin/pricing/export — downloads a CSV snapshot of every SKU's cost
// and computed pricing. Read-only; the counterpart bulk-edit path is the
// "Import costs from CSV" upload on the pricing admin page (actions.ts'
// importCostCsvAction), which re-uses this same column layout for the
// sku/fob_usd/is_estimated/notes columns so an exported file can be edited
// and re-imported directly.
import { createClient } from "@/lib/supabase/server";

function csvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const { data: profile } = await supabase.from("amblux_profiles").select("role, approved").eq("id", user.id).single();
  if (!profile || profile.role !== "admin" || !profile.approved) {
    return new Response("Admin access required", { status: 403 });
  }

  const [{ data: products }, { data: costs }, { data: pricing }] = await Promise.all([
    supabase.from("amblux_products").select("sku, category, label").order("sku"),
    supabase.from("amblux_product_cost").select("*"),
    supabase.from("amblux_pricing").select("product_sku, tier, price_cents, currency"),
  ]);

  const costBySku = new Map((costs ?? []).map((c) => [c.sku, c]));
  const priceBySku = new Map<string, Map<string, number>>();
  (pricing ?? []).forEach((p) => {
    const key = `${p.tier}_${p.currency}`;
    if (!priceBySku.has(p.product_sku)) priceBySku.set(p.product_sku, new Map());
    priceBySku.get(p.product_sku)!.set(key, p.price_cents);
  });

  const header = [
    "sku",
    "category",
    "label",
    "fob_usd",
    "is_estimated",
    "notes",
    "msrp_cad",
    "msrp_usd",
    "distributor_cad",
    "distributor_usd",
    "dealer_cad",
    "dealer_usd",
  ];
  const rows = (products ?? [])
    .filter((p) => p.sku !== "AMB-APP")
    .map((p) => {
      const cost = costBySku.get(p.sku);
      const prices = priceBySku.get(p.sku);
      const centsToDollars = (cents: number | undefined) => (cents === undefined ? "" : (cents / 100).toFixed(2));
      return [
        p.sku,
        p.category,
        p.label,
        cost?.fob_usd ?? "",
        cost?.is_estimated ?? "",
        cost?.notes ?? "",
        centsToDollars(prices?.get("msrp_CAD")),
        centsToDollars(prices?.get("msrp_USD")),
        centsToDollars(prices?.get("distributor_CAD")),
        centsToDollars(prices?.get("distributor_USD")),
        centsToDollars(prices?.get("dealer_CAD")),
        centsToDollars(prices?.get("dealer_USD")),
      ]
        .map(csvField)
        .join(",");
    });

  const csv = [header.join(","), ...rows].join("\n") + "\n";
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="amblux-pricing-${date}.csv"`,
    },
  });
}
