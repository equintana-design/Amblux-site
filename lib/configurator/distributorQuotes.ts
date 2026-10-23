// An admin-built initial-order quote SENT TO a hardware distributor (e.g.
// Berenson) — the mirror image of the vendor order builder
// (lib: see app/admin/orders/OrderBuilder.tsx, which is for ordering FROM
// a supplier). This one shows the distributor what they'd pay Amblux
// (distributor tier) and the resale margin they'd have against the
// dealer tier, across any SKU in the catalog.
//
// Reuses amblux_quotes/amblux_quote_line_items (migration 0001) under a
// third `kind` — 'distributor_quote' (migration 0037) — exactly the way
// migration 0032 already reused the same table for Project (kind='quick')
// saves. See quickProject.ts for that precedent; this file mirrors its
// shape (a flat picked-SKU list, a synthesized BomResult, no zone/wattage
// data) rather than the full zone-based ConfiguratorState.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BomResult } from "./types";

type Client = SupabaseClient<Database>;

export interface DistributorQuoteLineItem {
  sku: string;
  label: string;
  qty: number;
}

export interface DistributorQuoteRecipient {
  // Set when the quote is addressed to an existing Hardware Distributor
  // account (picked from /admin/distributors' own role list) rather than
  // an as-yet-unsigned-up prospect. null is the same "no account behind
  // this row" convention amblux_quotes.account_id already uses.
  distributorAccountId: string | null;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
}

export interface DistributorQuoteState {
  recipient: DistributorQuoteRecipient;
  quoteDate: string; // yyyy-mm-dd, editable — defaults to today when new
  notes: string;
  lineItems: DistributorQuoteLineItem[];
}

export function distributorQuoteDefault(): DistributorQuoteState {
  return {
    recipient: { distributorAccountId: null, companyName: "", contactName: "", email: "", phone: "", address: "" },
    quoteDate: new Date().toISOString().slice(0, 10),
    notes: "",
    lineItems: [],
  };
}

// One BOM row per line item, all under a single made-up "zone" label —
// same reasoning as bomFromQuickProject: there's no real zone/room concept
// here, this is purely so the shape matches BomResult for anything that
// might later want to treat a saved quote generically. total (watts) is
// always 0 — a distributor quote carries no wattage data, only pricing.
export function bomFromDistributorQuote(state: DistributorQuoteState): BomResult {
  return {
    rows: state.lineItems.map((item) => ({
      zone: "Distributor quote",
      qty: item.qty,
      sku: item.sku,
      description: item.label,
    })),
    total: 0,
  };
}

function toJson<T>(value: T): Database["public"]["Tables"]["amblux_quotes"]["Insert"]["state"] {
  return JSON.parse(JSON.stringify(value));
}

// Local, deliberately simple job-number generator — NOT the configurator's
// generateJobNumber()/hashBom() (lib/configurator/engine.ts), which are
// typed around a full BomResult and configurator-specific naming. A
// distributor quote only needs something short, stable once assigned, and
// readable on a printed PO — company name + date + a few random chars is
// enough, and keeping it local avoids pulling engine.ts's configurator-
// specific types into an unrelated admin tool.
function generateQuoteNumber(companyName: string): string {
  const slug = (companyName || "DIST").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20);
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `DQ-${slug || "DIST"}-${stamp}-${rand}`;
}

export interface DistributorQuoteSummary {
  id: string;
  jobNumber: string;
  companyName: string;
  status: string;
  updatedAt: string;
}

export async function saveDistributorQuote(
  supabase: Client,
  args: { id: string | null; accountId: string | null; state: DistributorQuoteState },
): Promise<{ id: string; jobNumber: string }> {
  const payload = {
    account_id: args.accountId,
    kind: "distributor_quote" as const,
    state: toJson(args.state),
    bom: toJson(bomFromDistributorQuote(args.state)),
    total_watts: null,
  };

  if (args.id) {
    const { error } = await supabase.from("amblux_quotes").update(payload).eq("id", args.id);
    if (error) throw error;
    // job_number doesn't change on update — fetch it back for the caller
    // rather than re-deriving it, since it was fixed at creation time.
    const { data } = await supabase.from("amblux_quotes").select("job_number").eq("id", args.id).single();
    return { id: args.id, jobNumber: data?.job_number ?? "" };
  }

  const jobNumber = generateQuoteNumber(args.state.recipient.companyName);
  const { data, error } = await supabase
    .from("amblux_quotes")
    .insert({ ...payload, job_number: jobNumber })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id, jobNumber };
}

export async function listDistributorQuotes(supabase: Client): Promise<DistributorQuoteSummary[]> {
  const { data, error } = await supabase
    .from("amblux_quotes")
    .select("id, job_number, state, status, updated_at")
    .eq("kind", "distributor_quote")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const state = row.state as unknown as DistributorQuoteState | null;
    return {
      id: row.id,
      jobNumber: row.job_number,
      companyName: state?.recipient?.companyName?.trim() || "Untitled quote",
      status: row.status,
      updatedAt: row.updated_at,
    };
  });
}

export async function loadDistributorQuote(
  supabase: Client,
  id: string,
): Promise<{ jobNumber: string; status: string; state: DistributorQuoteState } | null> {
  const { data, error } = await supabase
    .from("amblux_quotes")
    .select("job_number, status, state")
    .eq("id", id)
    .eq("kind", "distributor_quote")
    .single();
  if (error || !data) return null;

  const raw = data.state as unknown as Partial<DistributorQuoteState> | null;
  const defaults = distributorQuoteDefault();
  return {
    jobNumber: data.job_number,
    status: data.status,
    state: {
      recipient: { ...defaults.recipient, ...(raw?.recipient ?? {}) },
      quoteDate: raw?.quoteDate || defaults.quoteDate,
      notes: raw?.notes ?? "",
      lineItems: Array.isArray(raw?.lineItems) ? raw.lineItems : [],
    },
  };
}

export async function markDistributorQuoteSent(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("amblux_quotes").update({ status: "submitted" }).eq("id", id);
  if (error) throw error;
}

// Permanent delete — admins only (RLS "admins can delete any
// amblux_quotes", migration 0037). Reuses the same table deleteQuote()
// (quotes.ts) already works against; kept as a separate named export here
// so this module doesn't need to import from quotes.ts for one line.
export async function deleteDistributorQuote(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("amblux_quotes").delete().eq("id", id);
  if (error) throw error;
}
