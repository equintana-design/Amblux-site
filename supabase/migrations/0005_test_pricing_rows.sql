-- ***********************************************************************
-- TEST-ONLY pricing data. These are NOT real AMBLUX prices.
-- ***********************************************************************
-- Real pricing is still blocked on the pricing-reconciliation decision
-- (see the plan doc / migration 0004's header comment) — amblux_pricing is
-- otherwise empty on purpose. These two rows exist solely so the
-- role-based pricing gate (msrp public / distributor RLS-gated to
-- approved accounts) can be demonstrated end-to-end in the live app: sign
-- up, see MSRP only, get approved by an admin, then see distributor
-- pricing appear. The numbers below (12.34 / 8.88, 23.45 / 15.67) are
-- deliberately odd, round-looking figures chosen so nobody mistakes them
-- for real catalog pricing. Delete this migration's rows (or supersede
-- with a real pricing migration) once real pricing is populated.
--
-- Idempotent like 0004: safe to re-run.

insert into public.amblux_pricing (product_sku, tier, price_cents, currency)
values
  -- Flexible Silicone 6x6mm, 3m, 3000K linear piece
  ('AMB-FCST-RC0606-24V-30-24-90-3M-27W', 'msrp', 1234, 'USD'),
  ('AMB-FCST-RC0606-24V-30-24-90-3M-27W', 'distributor', 888, 'USD'),
  -- Recessed puck fixture
  ('AMB-PK-RC58-24V-345-90-35W-LE', 'msrp', 2345, 'USD'),
  ('AMB-PK-RC58-24V-345-90-35W-LE', 'distributor', 1567, 'USD')
on conflict (product_sku, tier) do update
  set price_cents = excluded.price_cents,
      currency = excluded.currency,
      updated_at = now();
