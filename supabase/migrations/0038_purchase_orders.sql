-- amblux_purchase_orders: a vendor purchase order auto-generated FROM a
-- saved distributor quote (lib/configurator/distributorQuotes.ts), one
-- row per vendor represented in that quote's line items. Added so that
-- building a distributor quote (money coming in) automatically produces
-- the matching vendor order(s) (money going out) needed to fulfill it —
-- unlike the live, nothing-saved /admin/orders generator (migration 0036),
-- these ARE saved so they can be reopened/reprinted later, same as
-- distributor quotes themselves (migration 0037).
--
-- Regenerated in full every time the source distributor quote is saved
-- (lib/configurator/purchaseOrders.ts syncPurchaseOrdersForQuote): existing
-- rows for that quote are replaced to match the quote's current line
-- items, reusing the same po_number per vendor across re-saves so a saved
-- link to one of these stays valid. line_items is a jsonb snapshot (sku,
-- vendorSku, label, qty, unit, qtyPerAmbluxSku, unitPriceUsd,
-- vendorUnits, lineTotalUsd) taken from amblux_vendor_skus at generation
-- time, so a later price change there doesn't retroactively alter an
-- already-saved order — same reasoning as a saved distributor quote not
-- tracking live catalog price changes either.
--
-- SKUs in the source quote with no amblux_vendor_skus mapping at all are
-- deliberately NOT represented here — they're reported back to the
-- caller at generation time (see syncPurchaseOrdersForQuote's return
-- value) so the UI can flag them, rather than being persisted anywhere,
-- since which SKUs are unmapped is a property of the live catalog state,
-- not something this snapshot should freeze.
create table public.amblux_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  distributor_quote_id uuid not null references public.amblux_quotes(id) on delete cascade,
  vendor_id uuid not null references public.amblux_vendors(id) on delete cascade,
  po_number text not null,
  line_items jsonb not null default '[]'::jsonb,
  total_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (distributor_quote_id, vendor_id)
);

alter table public.amblux_purchase_orders enable row level security;

-- Same admin-only pattern as amblux_vendors/amblux_vendor_skus (migration
-- 0036) — vendor pricing/cost data has no legitimate non-admin reader.
create policy "amblux_purchase_orders are managed by admins"
  on public.amblux_purchase_orders for all
  to authenticated
  using (private.amblux_is_admin())
  with check (private.amblux_is_admin());
