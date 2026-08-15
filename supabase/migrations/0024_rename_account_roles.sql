-- Rename account-role vocabulary from (distributor, dealer, admin) to
-- (client, distributor, admin). "Client" becomes the default sign-up
-- tier (was "distributor"); an admin promotes an account up to
-- "distributor" (was "dealer") or "admin", same as before.
--
-- Deliberately NOT touched: amblux_pricing.tier ('msrp'/'distributor'/
-- 'dealer') and amblux_product_cost's distributor_margin_pct/
-- dealer_margin_pct columns. Those name AMBLUX's own landed-cost-to-MSRP
-- margin ladder (what AMBLUX charges a distributor, what a distributor
-- charges a dealer, what MSRP is) -- a different vocabulary from "who
-- can sign into the website as what," which is what this migration
-- renames. The pricing RLS policy below still maps the renamed account
-- roles onto the unchanged pricing tiers with the exact same effective
-- access as before.
--
-- Applied directly to the live database (mcp Supabase apply_migration)
-- on 2026-08-15; this file exists for migration history/local dev, not
-- as a pending change.

-- 1. Move existing data out from under the old constraint via a
--    temporary label, since old 'distributor' and old 'dealer' both
--    need to change to values that collide with each other's old name.
alter table public.amblux_profiles drop constraint amblux_profiles_role_check;

update public.amblux_profiles set role = '_migrating_client' where role = 'distributor';
update public.amblux_profiles set role = 'distributor' where role = 'dealer';
update public.amblux_profiles set role = 'client' where role = '_migrating_client';

alter table public.amblux_profiles
  add constraint amblux_profiles_role_check check (role in ('client', 'distributor', 'admin'));

alter table public.amblux_profiles alter column role set default 'client';

comment on table public.amblux_profiles is
  'AMBLUX client/distributor/admin account metadata, separate from CLB''s unrelated accounts table. approved=false means signed up but not yet pricing-gated in. Default role is client; an admin promotes an account to distributor or admin via /admin/distributors.';

-- 2. New-signup trigger: default role is now 'client', not 'distributor'.
create or replace function private.handle_new_amblux_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.amblux_profiles (id, email, role, approved)
  values (new.id, new.email, 'client', false)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- 3. amblux_pricing RLS: same effective access as before, just spelled
--    with the renamed roles (old 'distributor' role -> new 'client';
--    old 'dealer' role -> new 'distributor'). The tier values themselves
--    (msrp/distributor/dealer) are unchanged, see note above.
drop policy "amblux_pricing is readable per tier and role" on public.amblux_pricing;

create policy "amblux_pricing is readable per tier and role"
  on public.amblux_pricing for select
  to anon, authenticated
  using (
    tier = 'msrp'
    or (tier = 'distributor' and private.amblux_has_approved_role(array['client', 'distributor', 'admin']))
    or (tier = 'dealer' and private.amblux_has_approved_role(array['distributor', 'admin']))
  );
