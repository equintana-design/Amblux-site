-- AMBLUX product catalog, role-based pricing, and quotes/BOM schema.
--
-- Lives in its own dedicated Supabase project ("amblux-production"),
-- separate from Cabinet Light Builder's kcc-production project — a
-- deliberate change from the original plan (which assumed extending
-- kcc-production) once it was clear AMBLUX and CLB may evolve as separate
-- products with separate features. A shared project would have meant a
-- shared auth.users pool between two different businesses' customers, and
-- any AMBLUX migration carrying real risk to CLB's live paying customers.
-- Full project-level isolation removes both. The amblux_ table prefix is
-- kept anyway even though nothing else lives in this project now — cheap
-- to keep, no reason to rename what's already tested.
--
-- Scope is deliberately narrow, per the "launch lean, adopt ERPNext later
-- for back-office" decision: this is catalog + role-based pricing + quotes
-- only. No purchase orders, no inventory/warehouses, no accounting, no
-- general customer/company CRM fields beyond what pricing-tier gating
-- needs — those are exactly the tables that would become dead weight (or
-- worse, migration debt) if ERPNext is adopted later for that half.
--
-- Tested before being applied here: run against a real local Postgres 16
-- instance, seeded with sample data, and verified under four simulated
-- access levels (anonymous, approved distributor, authenticated-but-
-- unknown, admin) — including a real bug this caught and fixed (infinite
-- RLS recursion in the original admin-check policies).

-- ---------------------------------------------------------------------
-- amblux_linear_families
-- Family-level metadata — mirrors lib/configurator/catalog.ts's
-- LINEAR_FAMILIES exactly, so this table can become that data's real
-- source once the app is wired to read from Supabase instead of the
-- hardcoded TypeScript array. id matches the same string ids already used
-- in the app (e.g. "rigid-10x15") so no remapping is needed later.
-- ---------------------------------------------------------------------
create table public.amblux_linear_families (
  id text primary key,
  label text not null,
  type text not null check (type in ('flexible', 'rigid')),
  mounting text not null check (mounting in ('recess', 'surface')),
  watts_per_metre numeric not null,
  power_cord_sku text,
  install_accessory_sku text,
  install_accessory_label text,
  -- Matches installAccessoryOptional in catalog.ts — true only for
  -- rigid-10x15 today (the "Add to BOM" toggle you asked for).
  install_accessory_optional boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.amblux_linear_families is
  'Real AMBLUX linear product families (physical profile + mounting), mirroring catalog.ts LINEAR_FAMILIES. Not pricing-sensitive — safe to read publicly.';

-- ---------------------------------------------------------------------
-- amblux_products
-- The full real-SKU catalog: linear pieces, pucks, drivers/PSUs, controls,
-- receivers, faceplates, power cords, and install accessories (brackets/
-- clips) all live here as rows, distinguished by `category`. `spec` is a
-- flexible jsonb bag for whatever attributes that category needs (CCT,
-- stock length, finish, IP rating, wattage, ...) so adding a new spec
-- field later doesn't require a migration.
-- ---------------------------------------------------------------------
create table public.amblux_products (
  sku text primary key,
  category text not null check (category in (
    'linear_piece', 'puck', 'faceplate', 'driver', 'control',
    'receiver', 'power_cord', 'install_accessory', 'extension_cord'
  )),
  family_id text references public.amblux_linear_families(id),
  label text not null,
  short_description text,
  mounting text check (mounting in ('recess', 'surface')),
  cct text check (cct in ('3000', '4000')),
  -- Every field below is optional and category-specific; kept as columns
  -- (not folded into spec) only where the app already filters/sorts on
  -- them today (length, watts) — everything else goes in spec.
  length_m numeric,
  watts numeric,
  spec jsonb not null default '{}'::jsonb,
  -- Matches the plan doc's decision: every product gets a status so items
  -- can be added/pulled from view without deleting history.
  status text not null default 'active' check (status in ('active', 'backordered', 'coming_soon', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.amblux_products is
  'Real AMBLUX SKUs across every product category the configurator resolves — the eventual real source for catalog.ts. Not pricing-sensitive on its own.';

create index amblux_products_family_id_idx on public.amblux_products(family_id);
create index amblux_products_category_idx on public.amblux_products(category);
create index amblux_products_status_idx on public.amblux_products(status);

-- ---------------------------------------------------------------------
-- amblux_profiles
-- Extends auth.users for AMBLUX's own site accounts — deliberately
-- separate from CLB's `accounts` table (that one is CLB's Stripe/SaaS
-- billing identity, a different product with different customers).
-- Only distributor/dealer/admin accounts need a row here; ordinary public
-- site visitors are unauthenticated and never get one.
-- ---------------------------------------------------------------------
create table public.amblux_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'distributor' check (role in ('distributor', 'dealer', 'admin')),
  company_name text,
  -- Distributor/dealer pricing is gated on this — signing up does not by
  -- itself grant access to buy pricing, matches the plan doc's "a logged-in,
  -- APPROVED distributor sees their own buy price" language.
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.amblux_profiles is
  'AMBLUX distributor/dealer/admin account metadata, separate from CLB''s unrelated accounts table. approved=false means signed up but not yet pricing-gated in.';

-- ---------------------------------------------------------------------
-- amblux_pricing
-- The actual role-based pricing split: public MSRP vs. distributor buy
-- price vs. a future dealer tier (per the plan doc's still-open "third
-- tier" question — the column exists so that decision doesn't require a
-- schema change later, it just requires deciding to populate it).
-- One current price per (sku, tier) — history/versioning intentionally
-- deferred until the pricing-reconciliation work (still paused) resumes.
-- ---------------------------------------------------------------------
create table public.amblux_pricing (
  id uuid primary key default gen_random_uuid(),
  product_sku text not null references public.amblux_products(sku) on delete cascade,
  tier text not null check (tier in ('msrp', 'distributor', 'dealer')),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'USD',
  updated_at timestamptz not null default now(),
  unique (product_sku, tier)
);

comment on table public.amblux_pricing is
  'Role-gated pricing per SKU per tier. msrp is public; distributor/dealer are RLS-gated to approved accounts of that role. This is the one table where RLS actually matters.';

-- ---------------------------------------------------------------------
-- amblux_quotes
-- One row per configurator run a customer/distributor saves — state +
-- computed BOM snapshot, deliberately shaped like CLB's own `projects`
-- table (state jsonb, bom_result jsonb, total_watts) since the plan doc
-- says architecture should follow how CLB was built. account_id is
-- nullable so the public /embed configurator can save a quote without
-- requiring a distributor login.
-- ---------------------------------------------------------------------
create table public.amblux_quotes (
  id uuid primary key default gen_random_uuid(),
  job_number text not null unique,
  account_id uuid references auth.users(id) on delete set null,
  state jsonb not null,
  bom jsonb not null,
  total_watts numeric,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'converted', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.amblux_quotes is
  'One saved configurator run: full state + computed BOM snapshot + job number. account_id null = anonymous/embed quote.';

create index amblux_quotes_account_id_idx on public.amblux_quotes(account_id);

-- ---------------------------------------------------------------------
-- amblux_quote_line_items
-- Normalized/flattened copy of amblux_quotes.bom, purely so line items are
-- queryable/joinable in SQL (e.g. "total qty of SKU X sold this month")
-- without parsing jsonb every time. The jsonb snapshot on amblux_quotes
-- stays the source of truth for re-rendering a quote; this table is a
-- reporting convenience, kept in sync by the app at write time.
-- ---------------------------------------------------------------------
create table public.amblux_quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.amblux_quotes(id) on delete cascade,
  zone text not null,
  sku text not null,
  qty numeric not null,
  description text not null,
  notes text
);

create index amblux_quote_line_items_quote_id_idx on public.amblux_quote_line_items(quote_id);
create index amblux_quote_line_items_sku_idx on public.amblux_quote_line_items(sku);

-- =======================================================================
-- Row Level Security
-- =======================================================================

alter table public.amblux_linear_families enable row level security;
alter table public.amblux_products enable row level security;
alter table public.amblux_profiles enable row level security;
alter table public.amblux_pricing enable row level security;
alter table public.amblux_quotes enable row level security;
alter table public.amblux_quote_line_items enable row level security;

-- ---------------------------------------------------------------------
-- Role-check helper functions.
--
-- Every policy below that needs to know "is this user an approved admin/
-- distributor/dealer" goes through one of these two functions instead of a
-- raw `exists (select ... from amblux_profiles ...)` inline in the policy.
-- That's not a style choice — a plain correlated subquery against
-- amblux_profiles, used inside a POLICY that itself governs
-- amblux_profiles (the admin-read-all policy) or that's evaluated while
-- amblux_profiles' own RLS is active (any other table's policy that reads
-- amblux_profiles), re-triggers amblux_profiles' RLS on every lookup —
-- which re-evaluates the admin policy again, infinitely. This was caught
-- by actually running the migration and testing as an authenticated role
-- locally, not just eyeballing it — see the cover message.
--
-- SECURITY DEFINER makes the function run as its owner (the migration
-- role, which owns the tables) rather than the calling role, so the
-- lookup inside it bypasses RLS entirely instead of re-entering it.
-- ---------------------------------------------------------------------

create or replace function public.amblux_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.amblux_profiles
    where id = auth.uid() and role = 'admin' and approved
  );
$$;

create or replace function public.amblux_has_approved_role(allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.amblux_profiles
    where id = auth.uid() and approved and role = any(allowed_roles)
  );
$$;

-- Structural catalog data (families, products) carries no pricing and is
-- safe to expose to anyone — including the public /embed route, which by
-- design has no logged-in user at all. Writes are intentionally NOT
-- granted to anon/authenticated here: catalog management goes through the
-- service-role-backed admin panel (planned), not direct client writes.

create policy "amblux_linear_families are publicly readable"
  on public.amblux_linear_families for select
  to anon, authenticated
  using (true);

create policy "amblux_products are publicly readable unless hidden"
  on public.amblux_products for select
  to anon, authenticated
  using (status <> 'hidden');

-- A signed-in admin should still see hidden/backordered/coming_soon items
-- (e.g. for the future admin panel) — separate, additive policy rather
-- than folding admin logic into the public one above.
create policy "admins can read all amblux_products regardless of status"
  on public.amblux_products for select
  to authenticated
  using (public.amblux_is_admin());

-- Profiles: a user manages only their own row. Admins can read all, to
-- support an approvals workflow (approving a new distributor signup).
create policy "users can read their own amblux_profile"
  on public.amblux_profiles for select
  to authenticated
  using (id = auth.uid());

create policy "users can update their own amblux_profile"
  on public.amblux_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "admins can read all amblux_profiles"
  on public.amblux_profiles for select
  to authenticated
  using (public.amblux_is_admin());

-- Pricing: this is the actual access-control point. msrp is public.
-- distributor/dealer tiers require an approved profile of that role (or
-- admin, who can see everything). No insert/update/delete policy is
-- granted to anon/authenticated at all — pricing changes go through the
-- service-role-backed admin flow only, never a direct client write.

create policy "msrp pricing is publicly readable"
  on public.amblux_pricing for select
  to anon, authenticated
  using (tier = 'msrp');

create policy "approved distributors can read distributor pricing"
  on public.amblux_pricing for select
  to authenticated
  using (
    tier = 'distributor'
    and public.amblux_has_approved_role(array['distributor', 'dealer', 'admin'])
  );

create policy "approved dealers and admins can read dealer pricing"
  on public.amblux_pricing for select
  to authenticated
  using (
    tier = 'dealer'
    and public.amblux_has_approved_role(array['dealer', 'admin'])
  );

-- Quotes: owners manage their own; anonymous (embed) inserts are allowed
-- so a public visitor can save a configuration without an account, but
-- anonymous rows aren't selectable back by anon (no share-link/token
-- scheme yet — the app holds the result client-side after computing it).
-- Admins can read everything for support/order-processing purposes.

create policy "users can read their own amblux_quotes"
  on public.amblux_quotes for select
  to authenticated
  using (account_id = auth.uid());

create policy "users can insert their own amblux_quotes"
  on public.amblux_quotes for insert
  to authenticated
  with check (account_id = auth.uid());

create policy "anonymous embed quotes can be inserted"
  on public.amblux_quotes for insert
  to anon
  with check (account_id is null);

create policy "users can update their own amblux_quotes"
  on public.amblux_quotes for update
  to authenticated
  using (account_id = auth.uid())
  with check (account_id = auth.uid());

create policy "admins can read all amblux_quotes"
  on public.amblux_quotes for select
  to authenticated
  using (public.amblux_is_admin());

-- Line items inherit access through their parent quote.

create policy "users can read line items of their own amblux_quotes"
  on public.amblux_quote_line_items for select
  to authenticated
  using (
    exists (
      select 1 from public.amblux_quotes q
      where q.id = quote_id and q.account_id = auth.uid()
    )
  );

create policy "users can insert line items on their own amblux_quotes"
  on public.amblux_quote_line_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.amblux_quotes q
      where q.id = quote_id and q.account_id = auth.uid()
    )
  );

create policy "anonymous embed quote line items can be inserted"
  on public.amblux_quote_line_items for insert
  to anon
  with check (
    exists (
      select 1 from public.amblux_quotes q
      where q.id = quote_id and q.account_id is null
    )
  );

create policy "admins can read all amblux_quote_line_items"
  on public.amblux_quote_line_items for select
  to authenticated
  using (public.amblux_is_admin());
