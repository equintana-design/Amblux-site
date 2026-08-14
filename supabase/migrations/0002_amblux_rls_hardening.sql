-- Hardening pass over 0001's RLS policies, based on Supabase's own
-- security/performance advisors run immediately after applying 0001 on
-- the live amblux-production project (get_advisors, both security and
-- performance types) — not guessed at, the actual linter output.
--
-- Two real issues fixed:
-- 1. SECURITY: amblux_is_admin()/amblux_has_approved_role() were SECURITY
--    DEFINER functions living in the public schema, which PostgREST
--    exposes as public RPC endpoints (e.g. /rest/v1/rpc/amblux_is_admin)
--    callable directly by anyone, signed in or not. Not independently a
--    data leak (each only reports on the CALLING user's own role, since
--    both key off auth.uid()), but it's unnecessary public surface for
--    functions that only exist to be used from inside RLS policies. Fixed
--    by moving them into a `private` schema, which PostgREST does not
--    expose via its API — SQL execution (including from RLS policies)
--    still reaches them fine via explicit schema-qualification, only the
--    REST RPC route disappears.
-- 2. PERFORMANCE: several policies called auth.uid() directly in a
--    WHERE-style qual (e.g. `account_id = auth.uid()`), which Postgres
--    re-evaluates per row instead of once per query. Fixed by wrapping as
--    `(select auth.uid())`, which lets the planner hoist it into a
--    one-time initplan — same semantics, standard Supabase-recommended
--    pattern.
--
-- Also consolidates each table's split "public/own row" + "admin" SELECT
-- policies into one combined policy per table (same access outcome, OR'd
-- together) — Postgres has to evaluate every permissive policy on a table
-- for a given role/action, so two policies where one suffices is pure
-- overhead (also flagged by the advisor: "multiple permissive policies").
-- Confirmed this is still correct for anon specifically:
-- amblux_is_admin()/amblux_has_approved_role() key off auth.uid(), which
-- is null for the anon role, so the admin/role-gated half of each OR
-- naturally evaluates false for anon instead of needing a separate
-- anon-only policy.
--
-- Tested the same way as 0001: re-ran the full 4-role impersonation suite
-- (anonymous, approved distributor, authenticated-but-unknown, admin)
-- plus the quotes ownership/spoofing checks against this exact SQL on a
-- local Postgres 16 instance before applying it here — same results as
-- 0001, confirming the consolidation didn't change any actual access
-- outcome.

create schema if not exists private;

create or replace function private.amblux_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.amblux_profiles
    where id = (select auth.uid()) and role = 'admin' and approved
  );
$$;

create or replace function private.amblux_has_approved_role(allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.amblux_profiles
    where id = (select auth.uid()) and approved and role = any(allowed_roles)
  );
$$;

-- amblux_products: consolidate public-unless-hidden + admin-sees-all into one.
drop policy "amblux_products are publicly readable unless hidden" on public.amblux_products;
drop policy "admins can read all amblux_products regardless of status" on public.amblux_products;

create policy "amblux_products are readable per status or by admins"
  on public.amblux_products for select
  to anon, authenticated
  using (status <> 'hidden' or private.amblux_is_admin());

-- amblux_profiles: consolidate own-row + admin-reads-all; fix initplan on update too.
drop policy "users can read their own amblux_profile" on public.amblux_profiles;
drop policy "admins can read all amblux_profiles" on public.amblux_profiles;
drop policy "users can update their own amblux_profile" on public.amblux_profiles;

create policy "amblux_profiles are readable by their owner or by admins"
  on public.amblux_profiles for select
  to authenticated
  using (id = (select auth.uid()) or private.amblux_is_admin());

create policy "users can update their own amblux_profile"
  on public.amblux_profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- amblux_pricing: consolidate all three tier policies into one single
-- policy covering anon + authenticated (anon's role-gated branches
-- naturally evaluate false, as noted above).
drop policy "msrp pricing is publicly readable" on public.amblux_pricing;
drop policy "approved distributors can read distributor pricing" on public.amblux_pricing;
drop policy "approved dealers and admins can read dealer pricing" on public.amblux_pricing;

create policy "amblux_pricing is readable per tier and role"
  on public.amblux_pricing for select
  to anon, authenticated
  using (
    tier = 'msrp'
    or (tier = 'distributor' and private.amblux_has_approved_role(array['distributor', 'dealer', 'admin']))
    or (tier = 'dealer' and private.amblux_has_approved_role(array['dealer', 'admin']))
  );

-- amblux_quotes: consolidate own-row + admin; fix initplan on insert/update.
drop policy "users can read their own amblux_quotes" on public.amblux_quotes;
drop policy "admins can read all amblux_quotes" on public.amblux_quotes;
drop policy "users can insert their own amblux_quotes" on public.amblux_quotes;
drop policy "users can update their own amblux_quotes" on public.amblux_quotes;

create policy "amblux_quotes are readable by their owner or by admins"
  on public.amblux_quotes for select
  to authenticated
  using (account_id = (select auth.uid()) or private.amblux_is_admin());

create policy "users can insert their own amblux_quotes"
  on public.amblux_quotes for insert
  to authenticated
  with check (account_id = (select auth.uid()));

create policy "users can update their own amblux_quotes"
  on public.amblux_quotes for update
  to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

-- amblux_quote_line_items: consolidate own-via-quote + admin; fix initplan on insert.
drop policy "users can read line items of their own amblux_quotes" on public.amblux_quote_line_items;
drop policy "admins can read all amblux_quote_line_items" on public.amblux_quote_line_items;
drop policy "users can insert line items on their own amblux_quotes" on public.amblux_quote_line_items;

create policy "line items are readable via quote ownership or by admins"
  on public.amblux_quote_line_items for select
  to authenticated
  using (
    private.amblux_is_admin()
    or exists (
      select 1 from public.amblux_quotes q
      where q.id = quote_id and q.account_id = (select auth.uid())
    )
  );

create policy "users can insert line items on their own amblux_quotes"
  on public.amblux_quote_line_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.amblux_quotes q
      where q.id = quote_id and q.account_id = (select auth.uid())
    )
  );

-- Old public-schema functions are no longer referenced by any policy —
-- safe to drop now that everything above points at private.* instead.
drop function if exists public.amblux_is_admin();
drop function if exists public.amblux_has_approved_role(text[]);
