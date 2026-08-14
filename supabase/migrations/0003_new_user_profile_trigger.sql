-- Auto-creates an amblux_profiles row whenever someone signs up via
-- Supabase Auth, so the app never has to remember to do it client-side
-- (and RLS on amblux_profiles doesn't grant anon/authenticated INSERT at
-- all — this trigger, running SECURITY DEFINER as the table owner, is the
-- only way a profile row gets created).
--
-- Defaults: role='distributor', approved=false. Signing up does NOT grant
-- distributor pricing access by itself — an admin has to flip approved to
-- true first, matching the plan doc's "a logged-in, APPROVED distributor
-- sees their own buy price" language. company_name starts null; the
-- account page lets a user fill it in afterward via the existing
-- "users can update their own amblux_profile" policy from 0001/0002 — no
-- new policy needed for that.
--
-- Lives in the `private` schema (same reasoning as the role-check helper
-- functions in 0002): this function has no reason to be reachable via
-- PostgREST, it only needs to be callable by the trigger itself.

create or replace function private.handle_new_amblux_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.amblux_profiles (id, role, approved)
  values (new.id, 'distributor', false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_amblux on auth.users;

create trigger on_auth_user_created_amblux
  after insert on auth.users
  for each row
  execute function private.handle_new_amblux_user();
