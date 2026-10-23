import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderBuilder } from "./OrderBuilder";

// /admin/orders — generates a purchase order for a vendor on demand.
//
// Deliberately minimal, per the site owner's own call (2026-10-23): no
// amblux_purchase_orders history table, no auto-email send. This page just
// reads the vendor + amblux_vendor_skus cross-reference (migration 0036)
// and hands it to a client component where quantities are entered live and
// the finished order is produced as a printable/PDF page
// (window.print(), same pattern as app/configurator/BomSummaryStep.tsx)
// or a CSV download that opens directly in Excel (same pattern as
// app/admin/pricing/export/route.ts, just generated client-side since
// there's nothing server-side to persist).
export default async function AdminOrdersPage() {
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

  const { data: vendors } = await supabase.from("amblux_vendors").select("*").order("name");

  const vendorIds = (vendors ?? []).map((v) => v.id);
  const { data: vendorSkus } =
    vendorIds.length > 0
      ? await supabase
          .from("amblux_vendor_skus")
          .select("*")
          .in("vendor_id", vendorIds)
          .order("sku")
      : { data: [] };

  const skus = Array.from(new Set((vendorSkus ?? []).map((v) => v.sku)));
  const { data: products } =
    skus.length > 0
      ? await supabase.from("amblux_products").select("sku, label, category").in("sku", skus)
      : { data: [] };
  const productBySku = new Map((products ?? []).map((p) => [p.sku, p]));

  const vendorData = (vendors ?? []).map((vendor) => ({
    vendor,
    lines: (vendorSkus ?? [])
      .filter((vs) => vs.vendor_id === vendor.id)
      .map((vs) => ({
        ...vs,
        label: productBySku.get(vs.sku)?.label ?? vs.sku,
        category: productBySku.get(vs.sku)?.category ?? null,
      })),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 print:max-w-none print:px-0 print:py-0">
      <div className="print:hidden">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Admin</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Vendor order builder</h1>
        <p className="mt-2 text-sm text-muted">
          Pick a vendor, enter how many Amblux SKUs you need, and generate a purchase order — as a printable page
          (Print / Save as PDF) or as a CSV spreadsheet that opens directly in Excel. Quantities aren&apos;t saved
          anywhere; this is a one-shot generator, not an order-history tracker.
        </p>
      </div>

      {vendorData.length === 0 ? (
        <p className="mt-8 text-sm text-muted print:hidden">
          No vendors on file yet. Add one to <span className="font-mono">amblux_vendors</span> /{" "}
          <span className="font-mono">amblux_vendor_skus</span> to use this page.
        </p>
      ) : (
        <OrderBuilder vendorData={vendorData} />
      )}
    </div>
  );
}
