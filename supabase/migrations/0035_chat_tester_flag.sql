-- Stage 2 of the chat assistant's staged rollout (agreed with the site
-- owner 2026-09-13, needed now for a client demo the week of 2026-09-14):
-- a per-account "chat tester" flag so specific approved client accounts can
-- use the AI chat assistant without promoting them to Admin (Stage 1's
-- only gate today). Stage 3 will eventually open this to every approved
-- account and this column can be dropped again.
--
-- This is an access-control flag, the same sensitivity class as `role` and
-- `approved` — never `business_type` (migration 0030), which is
-- intentionally self-settable by the account itself. So it needs the exact
-- same treatment those two already get from migration 0006's
-- pin_restricted_amblux_profile_columns trigger: a non-admin's own UPDATE
-- can reach this row (RLS allows updating your own profile), but the
-- BEFORE UPDATE trigger must silently pin `chat_tester` back to its
-- existing value unless the request is from an admin — otherwise any
-- signed-in client could grant themselves chat access with a single
-- `.update({ chat_tester: true })` call from the browser, the exact
-- self-escalation bug 0006's own comments describe catching for
-- `role`/`approved` and fixing the same way.
alter table public.amblux_profiles
  add column if not exists chat_tester boolean not null default false;

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
    new.chat_tester := old.chat_tester;
  end if;
  return new;
end;
$$;
