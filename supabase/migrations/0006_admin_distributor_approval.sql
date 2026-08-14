-- Adds what's needed for a real admin approval screen (previously: direct
-- database updates only, per the "waiting on you" note in the plan doc).
--
-- Two pieces:
-- 1. amblux_profiles.email — auth.users isn't PostgREST-exposed at all
--    (Supabase never exposes the auth schema over the API, regardless of
--    role), so an admin page built on the browser/authenticated client
--    can't join against it to show who's who. Denormalizing email onto
--    amblux_profiles at signup time (via the same trigger from migration
--    0003) sidesteps that entirely — no new RPC/security-definer surface
--    needed, just one more column the trigger already had access to.
-- 2. An admin update policy on amblux_profiles, so an approved admin can
--    flip another account's `approved` (and, if ever needed, `role`)
--    without a service-role key. Consolidated into the existing "users
--    can update their own profile" policy rather than added as a second
--    permissive policy, matching 0002's "one policy per table/role/action"
--    pattern instead of reintroducing what that migration just fixed.
--
-- Tested locally, and this caught a real bug before it ever reached
-- production: the row-level policy alone (id = auth.uid() OR admin) lets
-- a signed-in distributor UPDATE their own row, but RLS only governs
-- which ROWS a statement can touch, not which COLUMNS within an allowed
-- row it changes. A first draft of this migration let any distributor
-- call `.update({ approved: true })` on their own profile and it would
-- have worked — self-approving straight past the admin gate the rest of
-- this feature exists to enforce. Caught by testing the negative case
-- (a non-admin explicitly trying to self-approve), not just the happy
-- path admin-approves-someone-else case.
--
-- Fixed with a BEFORE UPDATE trigger, since Postgres has no per-app-role
-- column privileges here (Supabase's "admin" is an application-level flag
-- in this same table, not a distinct Postgres role — a plain column-level
-- GRANT can't tell the two apart). The trigger silently pins `role`,
-- `approved`, and `email` back to their existing values on any update
-- from a non-admin, regardless of what the update statement asked for;
-- only `company_name` can move for a non-admin. Admins are unrestricted.
-- Re-tested after adding this: the self-approve attempt above now leaves
-- `approved` unchanged, while an admin approving a *different* profile
-- still works exactly as before.
--
-- Second bug the same local testing caught, and a more subtle one: the
-- trigger's first fix used `current_user = 'authenticated'` to distinguish
-- a real client request from trusted direct-SQL access (a migration, an
-- admin script, this project's own bootstrap step). That looked right in
-- isolation but is wrong for a SECURITY DEFINER trigger specifically:
-- current_user *inside* a SECURITY DEFINER function is always the
-- function's owner (postgres, here), never the role that actually invoked
-- the statement — Postgres changes current_user as part of what SECURITY
-- DEFINER means. So the check silently evaluated to "never true", and the
-- self-approve attempt above went through a second time even after the
-- first fix. Caught by re-running the exact same negative test rather
-- than assuming the first fix worked because the code looked right.
--
-- Fixed by keying off auth.role() instead, which reads the JWT-derived
-- role claim from the request's session-level GUC rather than the
-- Postgres role system — unaffected by SECURITY DEFINER's current_user
-- substitution, and null (so the condition is false, correctly leaving
-- trusted access alone) for anything that isn't a real PostgREST request.
-- Re-verified after this fix: self-approve now correctly leaves `role`/
-- `approved`/`email` unchanged while `company_name` still updates, an
-- admin approving someone else still works, and a direct-SQL bootstrap
-- update (no JWT/session context at all) is no longer reverted.

alter table public.amblux_profiles add column if not exists email text;

create or replace function private.handle_new_amblux_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.amblux_profiles (id, email, role, approved)
  values (new.id, new.email, 'distributor', false)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop policy "users can update their own amblux_profile" on public.amblux_profiles;

create policy "amblux_profiles are updatable by their owner or by admins"
  on public.amblux_profiles for update
  to authenticated
  using (id = (select auth.uid()) or private.amblux_is_admin())
  with check (id = (select auth.uid()) or private.amblux_is_admin());

create or replace function private.pin_restricted_amblux_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and not private.amblux_is_admin() then
    new.role := old.role;
    new.approved := old.approved;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists amblux_profiles_pin_restricted_columns on public.amblux_profiles;

create trigger amblux_profiles_pin_restricted_columns
  before update on public.amblux_profiles
  for each row
  execute function private.pin_restricted_amblux_profile_columns();
