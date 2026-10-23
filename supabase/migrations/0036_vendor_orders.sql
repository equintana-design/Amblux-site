-- Vendor/supplier tracking, for the "order template" tool
-- (/admin/orders). Nothing in the schema previously recorded who actually
-- supplies a given Amblux SKU, their own part number for it, or what they
-- charge — that cross-reference was worked out by hand against a vendor
-- quote (see claude/quote-eq001-sku-mapping.md in the project docs) when
-- the AMB-FCST-* family was added. This migration gives that information
-- a permanent home instead of living only in a one-off document.
--
-- Deliberately minimal, per the site owner's own call (2026-10-23):
-- no purchase-order history/status table yet (no amblux_purchase_orders),
-- just the vendor + vendor-SKU cross-reference an order gets *generated*
-- from on demand. Add a history table later only if it turns out to be
-- needed — easy to add without touching this part.
--
-- amblux_vendor_skus.qty_per_amblux_sku handles the fact that a vendor's
-- own selling unit often isn't the same as the Amblux SKU's unit — e.g.
-- the vendor sells LED tape by the metre, but Amblux stocks it as a 20 m
-- SKU; the vendor sells a connector individually, but Amblux stocks it as
-- a 5-pack. Ordering N Amblux SKUs from the vendor means ordering
-- N * qty_per_amblux_sku of the vendor's own unit, at unit_price_usd each.

create table public.amblux_vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  bank_info text,
  terms text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.amblux_vendor_skus (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.amblux_vendors(id) on delete cascade,
  sku text not null references public.amblux_products(sku) on delete cascade,
  vendor_sku text,
  unit_price_usd numeric not null,
  unit text not null default 'PCS',
  qty_per_amblux_sku integer not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  unique (vendor_id, sku)
);

alter table public.amblux_vendors enable row level security;
alter table public.amblux_vendor_skus enable row level security;

-- Same admin-only pattern as every other admin-managed table in this
-- schema (amblux_product_cost, amblux_pricing_parameters, etc.) — a single
-- "admins can do anything, nobody else can see it at all" policy, since
-- vendor pricing/bank details have no legitimate non-admin reader.
create policy "amblux_vendors are managed by admins"
  on public.amblux_vendors for all
  to authenticated
  using (private.amblux_is_admin())
  with check (private.amblux_is_admin());

create policy "amblux_vendor_skus are managed by admins"
  on public.amblux_vendor_skus for all
  to authenticated
  using (private.amblux_is_admin())
  with check (private.amblux_is_admin());

-- Seed: Surmountor Lighting (the only vendor on file today, per the site
-- owner's 2026-10-23 call to start with one) and the 14 AMB-FCST-* SKUs
-- sourced from them on quote EQ001, 2026-10-14.
insert into public.amblux_vendors (id, name, contact_name, email, phone, address, bank_info, terms, notes) values
('11111111-1111-1111-1111-111111111111', 'Surmountor Lighting Co., Limited', 'Fiona Peng', 'sales07@surmountor.com', '+86-191 6626 2942 (WhatsApp)',
 '4/F, No.2 Factory Building, Dayang, No.4 Tangwei Industrial Avenue, FuHai Street, Bao''an, Shenzhen, China',
 E'Beneficiary Bank: HSBC Hong Kong (THE HONGKONG SHANGHAI BANKING CORPORATION LIMITED)\nSWIFT Code: HSBCHKHHHKH\nBeneficiary: SURMOUNTOR LIGHTING CO LIMITED\nBeneficiary A/C NO: 509 741 666 838\nBeneficiary Bank Address: 1 Queen''s Road Central, Hong Kong',
 'EXW Shenzhen',
 'Source of the AMB-FCST-* silicone tape family and its accessories (quote EQ001, 2026-10-14). Attach PI number when making transfer.');

insert into public.amblux_vendor_skus (vendor_id, sku, vendor_sku, unit_price_usd, unit, qty_per_amblux_sku, notes) values
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-N0606D-24V-30-24-90-20M-192W', 'S-N0606D-FCFS', 5.16, 'M', 20, 'EQ001 item 1'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-N0408D-24V-3040-24-90-20M-192W', 'S-N0408D-FCFS-CCT', 4.80, 'M', 20, 'EQ001 item 2'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-N0410D-24V-3040-24-90-20M-192W', 'S-N0410D-FCFS-CCT', 4.88, 'M', 20, 'EQ001 item 3 — vendor doc also shows "S-N04010D-FCF-CCT", unconfirmed which is correct'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-NA1010D-24V-30-24-90-20M-192W', 'S-NA1010D-FCFS', 4.94, 'M', 20, 'EQ001 item 5 — vendor doc also shows "S-NA1010T-FCFS", unconfirmed which is correct'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-N0606D-PC-2M', 'N0606D-AP', 1.35, 'PCS', 5, 'EQ001 item 1'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-N0606D-N2N-CON', 'N0606-BP', 0.69, 'PCS', 5, 'EQ001 item 1'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-N0408D-PC-2M', 'N0408D-AP', 1.20, 'PCS', 5, 'EQ001 item 2'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-N0408D-N2N-CBL-15CM', 'N0408D-BP', 0.84, 'PCS', 5, 'EQ001 item 2'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-N0408D-N2N-CON', 'N0408D-DBP', 0.60, 'PCS', 5, 'EQ001 item 2'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-N0410D-PC-2M', 'N0410D-AP', 1.35, 'PCS', 5, 'EQ001 item 3'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-NA1010D-PC-2M', 'Solderless Plug', 0.72, 'PCS', 5, 'EQ001 item 5'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-NA1010D-N2N-CBL-15CM', 'NA1010T-FCFS-BP', 0.60, 'PCS', 5, 'EQ001 item 5'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-NA1010D-N2N-CON', 'NA1010T-FCFS-DBP', 0.95, 'PCS', 5, 'EQ001 item 5'),
('11111111-1111-1111-1111-111111111111', 'AMB-FCST-CCT-6PRTDS-16CM', 'CCT distribution box', 0.57, 'PCS', 5, 'EQ001 item 4');
