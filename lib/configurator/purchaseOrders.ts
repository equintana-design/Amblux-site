// Vendor purchase orders generated FROM a saved distributor quote — see
// migration 0038 for why this is a persisted snapshot rather than another
// live "one-shot generator" like app/admin/orders/OrderBuilder.tsx.
//
// This file owns the generation logic. lib/configurator/distributorQuotes.ts
// calls syncPurchaseOrdersForQuote() right after a distributor quote is
// saved (every save, not just on "mark as sent" — the site owner's own
// call), and the UI (DistributorQuoteBuilder) surfaces the result: which
// vendor order(s) now exist for this quote, and which SKUs in the quote
// have no vendor on file at all (flagged, never silently dropped without
// a trace, and never used to block the save).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { DistributorQuoteLineItem } from "./distributorQuotes";

type Client = SupabaseClient<Database>;

export interface PurchaseOrderLineItem {
  sku: string;
  label: string;
  vendorSku: string | null;
  qty: number; // in Amblux-SKU units, straight from the distributor quote line item
  unit: string;
  qtyPerAmbluxSku: number;
  unitPriceUsd: number;
  vendorUnits: number;
  lineTotalUsd: number;
}

export interface PurchaseOrderSummary {
  id: string;
  vendorId: string;
  vendorName: string;
  poNumber: string;
  totalUsd: number;
  lineItemCount: number;
}

export interface UnmappedSku {
  sku: string;
  label: string;
  qty: number;
}

export interface SyncPurchaseOrdersResult {
  purchaseOrders: PurchaseOrderSummary[];
  unmappedSkus: UnmappedSku[];
}

// Stable per (quote, vendor) so a link to one of these keeps working
// across re-saves of the source quote — see generation loop below, which
// reuses the previous po_number for a vendor that was already represented
// rather than minting a new one every time.
function generatePoNumber(quoteJobNumber: string, vendorName: string): string {
  const slug = vendorName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  return `PO-${quoteJobNumber || "QUOTE"}-${slug || "VENDOR"}`;
}

type VendorSkuWithVendor = Database["public"]["Tables"]["amblux_vendor_skus"]["Row"] & {
  amblux_vendors: { id: string; name: string } | null;
};

export async function syncPurchaseOrdersForQuote(
  supabase: Client,
  args: { quoteId: string; quoteJobNumber: string; lineItems: DistributorQuoteLineItem[] },
): Promise<SyncPurchaseOrdersResult> {
  const activeItems = args.lineItems.filter((li) => li.qty > 0);

  // Whatever vendor orders existed from a previous save of this quote —
  // kept so a vendor still present in this save reuses its old po_number
  // instead of getting a new one every time the quote is edited.
  const { data: existingRows, error: existingError } = await supabase
    .from("amblux_purchase_orders")
    .select("vendor_id, po_number")
    .eq("distributor_quote_id", args.quoteId);
  if (existingError) throw existingError;
  const previousPoNumberByVendor = new Map((existingRows ?? []).map((r) => [r.vendor_id, r.po_number]));

  if (activeItems.length === 0) {
    await supabase.from("amblux_purchase_orders").delete().eq("distributor_quote_id", args.quoteId);
    return { purchaseOrders: [], unmappedSkus: [] };
  }

  const skus = Array.from(new Set(activeItems.map((li) => li.sku)));
  const { data: vendorSkuRows, error: vsError } = await supabase
    .from("amblux_vendor_skus")
    .select("*, amblux_vendors(id, name)")
    .in("sku", skus);
  if (vsError) throw vsError;

  // A sku with more than one vendor on file doesn't happen today (unique
  // on (vendor_id, sku), but nothing stops two different vendors each
  // having their own row for the same sku) — first match wins. Flagging
  // that ambiguity isn't done here; it's a rare-enough future case that
  // it's better handled explicitly if/when it actually happens.
  const vendorSkuBySku = new Map<string, VendorSkuWithVendor>();
  for (const row of (vendorSkuRows ?? []) as VendorSkuWithVendor[]) {
    if (!vendorSkuBySku.has(row.sku)) vendorSkuBySku.set(row.sku, row);
  }

  const unmappedSkus: UnmappedSku[] = [];
  const groups = new Map<string, { vendorName: string; lines: PurchaseOrderLineItem[]; total: number }>();

  for (const item of activeItems) {
    const vs = vendorSkuBySku.get(item.sku);
    if (!vs || !vs.amblux_vendors) {
      unmappedSkus.push({ sku: item.sku, label: item.label, qty: item.qty });
      continue;
    }
    const vendorUnits = item.qty * vs.qty_per_amblux_sku;
    const lineTotal = vendorUnits * Number(vs.unit_price_usd);
    const group = groups.get(vs.vendor_id) ?? { vendorName: vs.amblux_vendors.name, lines: [], total: 0 };
    group.lines.push({
      sku: item.sku,
      label: item.label,
      vendorSku: vs.vendor_sku,
      qty: item.qty,
      unit: vs.unit,
      qtyPerAmbluxSku: vs.qty_per_amblux_sku,
      unitPriceUsd: Number(vs.unit_price_usd),
      vendorUnits,
      lineTotalUsd: lineTotal,
    });
    group.total += lineTotal;
    groups.set(vs.vendor_id, group);
  }

  // Regenerate in full: drop every existing purchase order for this quote,
  // then insert fresh rows for whichever vendors are represented now. A
  // vendor that was in a previous save but isn't anymore (quantities
  // zeroed out, line removed) correctly disappears; po_number stability
  // for a vendor still present comes from previousPoNumberByVendor above,
  // not from this delete being partial.
  await supabase.from("amblux_purchase_orders").delete().eq("distributor_quote_id", args.quoteId);

  const purchaseOrders: PurchaseOrderSummary[] = [];
  for (const [vendorId, group] of groups) {
    const poNumber = previousPoNumberByVendor.get(vendorId) ?? generatePoNumber(args.quoteJobNumber, group.vendorName);
    const { data, error } = await supabase
      .from("amblux_purchase_orders")
      .insert({
        distributor_quote_id: args.quoteId,
        vendor_id: vendorId,
        po_number: poNumber,
        line_items: JSON.parse(JSON.stringify(group.lines)),
        total_usd: group.total,
      })
      .select("id")
      .single();
    if (error) throw error;
    purchaseOrders.push({
      id: data.id,
      vendorId,
      vendorName: group.vendorName,
      poNumber,
      totalUsd: group.total,
      lineItemCount: group.lines.length,
    });
  }

  return { purchaseOrders, unmappedSkus };
}

export async function listPurchaseOrdersForQuote(supabase: Client, quoteId: string): Promise<PurchaseOrderSummary[]> {
  const { data, error } = await supabase
    .from("amblux_purchase_orders")
    .select("id, vendor_id, po_number, total_usd, line_items, amblux_vendors(name)")
    .eq("distributor_quote_id", quoteId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    vendorId: row.vendor_id,
    vendorName: (row.amblux_vendors as { name: string } | null)?.name ?? "Unknown vendor",
    poNumber: row.po_number,
    totalUsd: Number(row.total_usd),
    lineItemCount: Array.isArray(row.line_items) ? row.line_items.length : 0,
  }));
}

export interface LoadedPurchaseOrder {
  id: string;
  poNumber: string;
  totalUsd: number;
  lineItems: PurchaseOrderLineItem[];
  vendor: {
    id: string;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    terms: string | null;
    bankInfo: string | null;
  };
  distributorQuoteId: string;
  createdAt: string;
  updatedAt: string;
}

export async function loadPurchaseOrder(supabase: Client, id: string): Promise<LoadedPurchaseOrder | null> {
  const { data, error } = await supabase
    .from("amblux_purchase_orders")
    .select("*, amblux_vendors(*)")
    .eq("id", id)
    .single();
  if (error || !data || !data.amblux_vendors) return null;
  const vendor = data.amblux_vendors as Database["public"]["Tables"]["amblux_vendors"]["Row"];
  return {
    id: data.id,
    poNumber: data.po_number,
    totalUsd: Number(data.total_usd),
    lineItems: ((data.line_items as unknown as PurchaseOrderLineItem[]) ?? []),
    vendor: {
      id: vendor.id,
      name: vendor.name,
      contactName: vendor.contact_name,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      terms: vendor.terms,
      bankInfo: vendor.bank_info,
    },
    distributorQuoteId: data.distributor_quote_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
