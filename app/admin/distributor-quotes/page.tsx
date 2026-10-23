import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listDistributorQuotes, loadDistributorQuote } from "@/lib/configurator/distributorQuotes";
import { DistributorQuoteBuilder } from "./DistributorQuoteBuilder";

// /admin/distributor-quotes — the mirror image of /admin/orders: that one
// builds an order FROM a vendor (money leaving Amblux); this one builds an
// initial-order quote TO SEND to a hardware distributor (e.g. Berenson —
// money coming in). Shows the distributor their own buy price
// (distributor tier) alongside the dealer tier, so the admin can see —
// and show the distributor — the resale margin on everything being
// quoted.
//
// Unlike the vendor order builder, these ARE saved (reusing amblux_quotes
// under kind='distributor_quote' — see migration 0037 and
// lib/configurator/distributorQuotes.ts) since a quote actually sent to a
// real company is worth being able to reopen later.
export default async function AdminDistributorQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ quote_id?: string }>;
}) {
  const { quote_id } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: myProfile } = await supabase
    .from("amblux_profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();
  if (!myProfile || myProfile.role !== "admin" || !myProfile.approved) redirect("/account");

  const [{ data: products }, { data: pricing }, { data: distributorProfiles }, quotes] = await Promise.all([
    supabase
      .from("amblux_products")
      .select("sku, label, category, status, cct, watts")
      .neq("sku", "AMB-APP")
      .order("category")
      .order("sku"),
    supabase
      .from("amblux_pricing")
      .select("product_sku, tier, price_cents")
      .eq("currency", "CAD")
      .in("tier", ["distributor", "dealer"]),
    supabase
      .from("amblux_profiles")
      .select("id, company_name, email")
      .eq("role", "distributor")
      .order("company_name"),
    listDistributorQuotes(supabase),
  ]);

  const priceBySku = new Map<string, { distributorCents?: number; dealerCents?: number }>();
  for (const row of pricing ?? []) {
    const entry = priceBySku.get(row.product_sku) ?? {};
    if (row.tier === "distributor") entry.distributorCents = row.price_cents;
    else if (row.tier === "dealer") entry.dealerCents = row.price_cents;
    priceBySku.set(row.product_sku, entry);
  }

  const catalog = (products ?? []).map((p) => ({
    sku: p.sku,
    label: p.label,
    category: p.category,
    status: p.status,
    distributorCents: priceBySku.get(p.sku)?.distributorCents ?? null,
    dealerCents: priceBySku.get(p.sku)?.dealerCents ?? null,
  }));

  const distributors = (distributorProfiles ?? []).map((d) => ({
    id: d.id,
    companyName: d.company_name || d.email || "Unnamed distributor",
    email: d.email ?? "",
  }));

  const initialQuote = quote_id ? await loadDistributorQuote(supabase, quote_id) : null;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 print:max-w-none print:px-0 print:py-0">
      <div className="print:hidden">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Admin</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Distributor quote builder</h1>
        <p className="mt-2 text-sm text-muted">
          Build an initial-order quote to send to a hardware distributor (e.g. Berenson). Pick any SKUs and
          quantities — each line shows what the distributor pays Amblux (distributor price) next to the dealer
          price, so you can both quote and show the resale margin in one document. Saved quotes can be reopened,
          printed/saved as PDF, exported to a CSV spreadsheet, or copied as an email-ready summary.
        </p>

        {quotes.length > 0 && (
          <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Saved quotes</h2>
            <div className="mt-3 flex flex-col gap-2">
              {quotes.map((q) => (
                <Link
                  key={q.id}
                  href={`/admin/distributor-quotes?quote_id=${q.id}`}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-background ${
                    q.id === quote_id ? "bg-background" : ""
                  }`}
                >
                  <span className="font-medium text-foreground">{q.companyName}</span>
                  <span className="font-mono text-xs text-muted">{q.jobNumber}</span>
                  <span className="text-xs capitalize text-muted">{q.status}</span>
                  <span className="text-xs text-muted">{new Date(q.updatedAt).toLocaleDateString()}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {quote_id && (
          <Link href="/admin/distributor-quotes" className="mt-4 inline-block text-sm font-medium text-accent-strong hover:underline">
            + Start a new quote
          </Link>
        )}
      </div>

      <DistributorQuoteBuilder
        key={quote_id ?? "new"}
        catalog={catalog}
        distributors={distributors}
        initialQuote={initialQuote ? { id: quote_id!, ...initialQuote } : null}
      />
    </div>
  );
}
