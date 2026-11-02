import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadPurchaseOrder } from "@/lib/configurator/purchaseOrders";
import { PurchaseOrderView } from "./PurchaseOrderView";

// /admin/purchase-orders/[id] — views/prints/exports ONE saved vendor
// purchase order, auto-generated from a distributor quote's line items
// (see lib/configurator/purchaseOrders.ts and migration 0038). Unlike
// /admin/orders (the live, nothing-saved generator), this page is a
// read-only view of a fixed snapshot — quantities and prices here were
// frozen at the moment the source distributor quote was last saved, so
// this page has no qty inputs of its own, just Print/CSV on the stored
// line_items.
export default async function AdminPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const po = await loadPurchaseOrder(supabase, id);
  if (!po) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 print:max-w-none print:px-0 print:py-0">
      <div className="print:hidden">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Admin</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Vendor purchase order</h1>
        <p className="mt-2 text-sm text-muted">
          Auto-generated from a distributor quote — quantities and prices are a fixed snapshot taken when that
          quote was last saved, not live. Reopen{" "}
          <Link
            href={`/admin/distributor-quotes?quote_id=${po.distributorQuoteId}`}
            className="font-medium text-accent-strong hover:underline"
          >
            the source quote
          </Link>{" "}
          to change quantities; saving it again regenerates this order.
        </p>
      </div>

      <PurchaseOrderView po={po} />
    </div>
  );
}
