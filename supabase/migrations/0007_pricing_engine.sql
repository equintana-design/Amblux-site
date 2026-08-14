-- Replaces the "import a static price list" plan with a real, configurable
-- cost-based pricing engine, per a direct course-correction from the
-- static-import approach this migration was originally going to take:
-- work from real product cost (FOB), calculate landed cost and margins
-- for AMBLUX/distributor/dealer, with every parameter in that chain
-- editable globally, per product category, or per individual SKU.
--
-- Design decisions (confirmed before writing this):
-- 1. Recalculation is on-demand only, via an explicit admin-triggered RPC
--    (amblux_recalculate_pricing()) — not live/automatic on every cost or
--    parameter edit. Keeps published prices stable and lets an admin
--    review parameter changes before they go live.
-- 2. USD pricing is a straight FX conversion of the computed CAD ladder
--    output, not a separate US-specific cost/duty/margin model. Simpler,
--    and matches how the business actually prices today.
-- 3. Six SKUs have no real supplier FOB cost on file yet. Four of those
--    were back-calculated to an estimated FOB by reversing the landed-
--    cost ladder against their existing manual-list distributor price,
--    and are flagged `is_estimated = true` with a note — real numbers
--    should replace these as soon as they're available. The other two
--    (AMB-FCRGL-SM-45DEG-PC-1.5M, AMB-FCRGL-SM1610-PC-1.5M) reverse-
--    derived to a *negative* FOB — the flat per-unit freight/insurance/
--    brokerage overhead alone exceeds what their low manual-list price
--    leaves room for under the standard ladder — so rather than fabricate
--    an unfounded number, they're left with no cost row at all and no
--    computed price until a real FOB is available.
-- AMB-APP (the Bluetooth app) is a free software feature, not a physical
-- good — it's excluded from the cost table entirely and given a
-- permanent flat $0 across every tier/currency directly below, bypassing
-- the ladder (which would otherwise still add fixed freight/duty/margin
-- overhead onto a $0 FOB and produce a nonzero price).
--
-- Source data for the seed below: /root/pricing.xlsx (manual distributor/
-- MSRP list, used only to back-fill missing FOB estimates) and
-- /root/landed_cost.xlsx (INPUTS sheet -> initial global parameters;
-- PRODUCTS sheet -> real FOB costs for 43 of the 49 catalog SKUs).
--
-- Tested locally against Postgres 16 with stubbed auth schema/roles
-- before being applied live (see this project's established migration
-- discipline in migrations 0002/0006).

-- ---------------------------------------------------------------------
-- 1. amblux_pricing needs to hold both CAD and USD rows per SKU/tier now
-- ---------------------------------------------------------------------
alter table public.amblux_pricing drop constraint amblux_pricing_product_sku_tier_key;
alter table public.amblux_pricing add constraint amblux_pricing_product_sku_tier_currency_key
  unique (product_sku, tier, currency);

-- ---------------------------------------------------------------------
-- 2. Cost basis, one row per physical SKU (AMB-APP intentionally absent)
-- ---------------------------------------------------------------------
create table public.amblux_product_cost (
  sku text primary key references public.amblux_products (sku) on delete cascade,
  fob_usd numeric not null check (fob_usd >= 0),
  is_estimated boolean not null default false,
  notes text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Pricing ladder parameters, scoped global / category / sku.
--    Whole-record-wins resolution (not a per-field merge): the most
--    specific matching row is used in full, so partial overrides aren't
--    possible by design — keeps the resolution logic simple and the
--    result predictable for whoever is editing parameters.
-- ---------------------------------------------------------------------
create table public.amblux_pricing_parameters (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'category', 'sku')),
  scope_key text,
  freight_usd numeric not null,
  insurance_usd numeric not null,
  brokerage_usd numeric not null,
  duty_pct numeric not null,
  inland_cad numeric not null,
  qc_pct numeric not null,
  fx_usd_cad numeric not null,
  amblux_margin_pct numeric not null,
  distributor_margin_pct numeric not null,
  dealer_margin_pct numeric not null,
  updated_at timestamptz not null default now(),
  constraint amblux_pricing_parameters_scope_key_matches_scope check (
    (scope = 'global' and scope_key is null) or
    (scope in ('category', 'sku') and scope_key is not null)
  )
);

-- At most one global row, and at most one row per (scope, scope_key) for
-- category/sku scopes.
create unique index amblux_pricing_parameters_one_global
  on public.amblux_pricing_parameters (scope) where scope = 'global';
create unique index amblux_pricing_parameters_scope_key_unique
  on public.amblux_pricing_parameters (scope, scope_key) where scope <> 'global';

-- ---------------------------------------------------------------------
-- 4. RLS: cost and pricing-parameter data is admin-only, full stop. It's
--    never read directly by distributor/dealer accounts or the public
--    site — only the published output in amblux_pricing is, via the
--    existing policies from migration 0002.
-- ---------------------------------------------------------------------
alter table public.amblux_product_cost enable row level security;
alter table public.amblux_pricing_parameters enable row level security;

create policy "only admins can access amblux_product_cost"
  on public.amblux_product_cost for all
  to authenticated
  using (private.amblux_is_admin())
  with check (private.amblux_is_admin());

create policy "only admins can access amblux_pricing_parameters"
  on public.amblux_pricing_parameters for all
  to authenticated
  using (private.amblux_is_admin())
  with check (private.amblux_is_admin());

-- ---------------------------------------------------------------------
-- 5. Resolve the effective parameter row for a given SKU: sku-scoped
--    override wins, then category-scoped, then the single global row.
-- ---------------------------------------------------------------------
create or replace function private.amblux_resolve_pricing_params(p_sku text, p_category text)
returns public.amblux_pricing_parameters
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.amblux_pricing_parameters
  where (scope = 'sku' and scope_key = p_sku)
     or (scope = 'category' and scope_key = p_category)
     or (scope = 'global')
  order by case scope when 'sku' then 0 when 'category' then 1 else 2 end
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- 6. On-demand recalculation: walks every costed SKU, runs the landed-
--    cost ladder (FOB -> + freight/insurance/brokerage -> + duty ->
--    x(1+QC buffer) -> landed USD -> xFX + inland CAD freight -> landed
--    CAD -> /(1-AMBLUX margin) -> distributor CAD -> /(1-distributor
--    margin) -> dealer CAD -> /(1-dealer margin) -> MSRP CAD), publishes
--    CAD rows plus an FX-converted USD row for each tier. Admin-only.
-- ---------------------------------------------------------------------
create or replace function public.amblux_recalculate_pricing()
returns table (skus_priced integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  params public.amblux_pricing_parameters;
  freight_docs numeric;
  duty numeric;
  subtotal numeric;
  landed_usd numeric;
  landed_cad numeric;
  distributor_cad numeric;
  dealer_cad numeric;
  msrp_cad numeric;
  n integer := 0;
begin
  if not private.amblux_is_admin() then
    raise exception 'only an approved admin can recalculate pricing';
  end if;

  for r in
    select c.sku, c.fob_usd, p.category
    from public.amblux_product_cost c
    join public.amblux_products p on p.sku = c.sku
  loop
    params := private.amblux_resolve_pricing_params(r.sku, r.category);
    if params is null then
      continue;
    end if;

    freight_docs := params.freight_usd + params.insurance_usd + params.brokerage_usd;
    duty := r.fob_usd * params.duty_pct;
    subtotal := r.fob_usd + freight_docs + duty;
    landed_usd := subtotal * (1 + params.qc_pct);
    landed_cad := landed_usd * params.fx_usd_cad + params.inland_cad;
    distributor_cad := landed_cad / (1 - params.amblux_margin_pct);
    dealer_cad := distributor_cad / (1 - params.distributor_margin_pct);
    msrp_cad := dealer_cad / (1 - params.dealer_margin_pct);

    insert into public.amblux_pricing (product_sku, tier, price_cents, currency)
    values
      (r.sku, 'distributor', round(distributor_cad * 100), 'CAD'),
      (r.sku, 'dealer', round(dealer_cad * 100), 'CAD'),
      (r.sku, 'msrp', round(msrp_cad * 100), 'CAD'),
      (r.sku, 'distributor', round(distributor_cad / params.fx_usd_cad * 100), 'USD'),
      (r.sku, 'dealer', round(dealer_cad / params.fx_usd_cad * 100), 'USD'),
      (r.sku, 'msrp', round(msrp_cad / params.fx_usd_cad * 100), 'USD')
    on conflict (product_sku, tier, currency) do update
      set price_cents = excluded.price_cents,
          updated_at = now();

    n := n + 1;
  end loop;

  return query select n;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Seed data: initial global parameters (from landed_cost.xlsx INPUTS),
--    per-SKU FOB costs (from landed_cost.xlsx PRODUCTS, back-filled with
--    reverse-derived estimates where noted), and AMB-APP's permanent $0.
--    Idempotent, like the earlier catalog-seeding migrations.
-- ---------------------------------------------------------------------
insert into public.amblux_pricing_parameters (
  scope, scope_key, freight_usd, insurance_usd, brokerage_usd, duty_pct,
  inland_cad, qc_pct, fx_usd_cad, amblux_margin_pct, distributor_margin_pct, dealer_margin_pct
) values (
  'global', null, 0.40, 0.05, 0.15, 0.04, 0.50, 0.02, 1.35, 0.50, 0.45, 0.30
)
on conflict (scope) where (scope = 'global') do nothing;

insert into public.amblux_product_cost (sku, fob_usd, is_estimated, notes)
values
  ('AMB-DMG-WRLSS-KNT-1ZWS', 14.33, false, null),
  ('AMB-DMG-WRLSS-KNT-2ZWS', 14.33, false, null),
  ('AMB-DMG-WRLSS-KNT-BTN', 12.2, false, null),
  ('AMB-WR-SS-1DOOR', 2.8, false, null),
  ('AMB-WR-SS-2DOOR', 6.89, true, 'reverse-derived from the manual price list — no real supplier FOB yet'),
  ('AMB-WR-SS-MS', 2.8, false, null),
  ('AMB-WR-SS-MS-DN', 4.9, true, 'reverse-derived from the manual price list — no real supplier FOB yet'),
  ('AMB-WR-SS-TOUCH-DMR', 2.8, false, null),
  ('AMB-WRLSS-MS', 4.5, false, null),
  ('AMB-WRLSS-SS-MDOOR', 4.5, false, null),
  ('AMB-WRLSS-SS-TOUCH-DMR', 3.5, false, null),
  ('AMB-DRV-24V-24W', 6.78, false, null),
  ('AMB-DRV-24V-36W', 8.25, false, null),
  ('AMB-DRV-24V-60W', 11.3, false, null),
  ('AMB-DRV-24V-96W', 14.5, false, null),
  ('AMB-EXT-2M', 0.98, false, null),
  ('AMB-PK-RC58-FACEPLATE-BK', 2, false, null),
  ('AMB-PK-RC58-FACEPLATE-SN', 2, false, null),
  ('AMB-PK-RC58-FACEPLATE-WH', 2, false, null),
  ('AMB-FCRGL-RC1015TR -BRKT', 0.64, false, null),
  ('AMB-FCRGL-SM-45DEG -BRKT', 0.64, false, null),
  ('AMB-FCRGL-SM1610 -BRKT', 0.64, false, null),
  ('AMB-FCST-SR1010-45DEG -CLIPS', 1.68, true, 'reverse-derived from the manual price list — no real supplier FOB yet'),
  ('AMB-FCRGL-RC0608TR-24V-30-24-90-2.4M-18W', 8.89, false, null),
  ('AMB-FCRGL-RC0608TR-24V-40-24-90-2.4M-18W', 8.89, false, null),
  ('AMB-FCRGL-RC1015TR -24V-40-24-90-2.4M-28.8W', 9.23, false, null),
  ('AMB-FCRGL-RC1015TR-24V-30-24-90-2.4M-28.8W', 9.23, false, null),
  ('AMB-FCRGL-SM-45DEG -24V-30-24-90-2.4M-28.8W', 7.2, false, null),
  ('AMB-FCRGL-SM1610 -24V-40-24-90-2.4M-28.8W', 9.23, false, null),
  ('AMB-FCRGL-SM1610-24V-30-24-90-2.4M-28.8W', 9.23, false, null),
  ('AMB-FCST-RC0485TR-24V-30-24-90-3M-18W', 16.95, false, null),
  ('AMB-FCST-RC0485TR-24V-40-24-90-3M-18W', 16.95, false, null),
  ('AMB-FCST-RC0606-24V-30-24-90-1.5M-13.5W', 8.4, false, null),
  ('AMB-FCST-RC0606-24V-30-24-90-3M-27W', 14.8, false, null),
  ('AMB-FCST-RC0606-24V-40-24-90-1.5M-13.5W', 8.4, false, null),
  ('AMB-FCST-RC0606-24V-40-24-90-3M-27W', 14.8, false, null),
  ('AMB-FCST-SR1010-45DEG -24V-30-24-90-3M-27W', 10.8, false, null),
  ('AMB-FCST-SR1010-45DEG -24V-30-24-90-5M-45W', 34.2, false, null),
  ('AMB-FCST-SR1010-45DEG -24V-40-24-90-3M-27W', 10.8, false, null),
  ('AMB-FCRGL-RC0608TR-PC-1.5M', 0.59, false, null),
  ('AMB-FCRGL-RC1015TR-PC-1.5M', 1.06, true, 'reverse-derived from the manual price list — no real supplier FOB yet'),
  ('AMB-PK-RC58-24V-345-90-35W-LE', 6.5, false, null),
  ('AMB-PK-SLSR35-24V-345-90-2W-CH', 3.34, false, null),
  ('AMB-PK-SLSR35-24V-345-90-2W-WH', 3.34, false, null),
  ('AMB-DMG-WRLSS-RCVR', 11.4, false, null),
  ('AMB-WRLSS-SS-RCVR', 3.5, false, null)
on conflict (sku) do update
  set fob_usd = excluded.fob_usd,
      is_estimated = excluded.is_estimated,
      notes = excluded.notes,
      updated_at = now();

-- AMB-APP: free software feature, permanently $0 across every tier and
-- currency, bypassing the cost engine entirely (it has no cost row above
-- and amblux_recalculate_pricing() only touches SKUs that do).
insert into public.amblux_pricing (product_sku, tier, price_cents, currency)
values
  ('AMB-APP', 'msrp', 0, 'CAD'),
  ('AMB-APP', 'distributor', 0, 'CAD'),
  ('AMB-APP', 'dealer', 0, 'CAD'),
  ('AMB-APP', 'msrp', 0, 'USD'),
  ('AMB-APP', 'distributor', 0, 'USD'),
  ('AMB-APP', 'dealer', 0, 'USD')
on conflict (product_sku, tier, currency) do update
  set price_cents = excluded.price_cents,
      updated_at = now();
