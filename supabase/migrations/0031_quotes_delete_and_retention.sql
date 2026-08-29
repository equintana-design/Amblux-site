-- Client-facing "delete a saved project" + a 12-month rolling save window.
--
-- Three pieces:
--
-- 1. amblux_quotes had no "updated_at" touch trigger at all — saveQuote()'s
--    UPDATE path (lib/configurator/quotes.ts) never included updated_at in
--    its payload, so re-saving an existing project silently left
--    updated_at frozen at its original insert time forever. That's a real
--    bug on its own, and it's the exact column the new 12-month *rolling*
--    window (resets on every save, per the user's explicit choice) has to
--    be based on — so it's fixed here as a prerequisite, not bundled in
--    application code where a client clock or a missed field could get it
--    wrong. Every UPDATE now stamps updated_at = now() server-side,
--    unconditionally, regardless of what the client sends.
--
-- 2. amblux_quotes never had a DELETE policy at all — only select/insert/
--    update existed (migration 0001), so a client had no way to remove a
--    saved project even though the app was about to grow a Delete button
--    for exactly that. account_id = auth.uid() (same predicate as the
--    existing update/select policies) is enough; the FK's
--    "on delete cascade" (also from migration 0001) already cleans up
--    amblux_quote_line_items for a deleted quote, no separate policy
--    needed on that table for this to work.
--
-- 3. A daily pg_cron job hard-deletes any quote (client-owned or anonymous
--    embed) whose updated_at is more than 12 months old — the actual
--    enforcement behind the "we keep saved projects for 12 months" note
--    now shown in the Saved Projects panel. This runs as a scheduled
--    background job, not through PostgREST, so it isn't subject to RLS
--    and doesn't need a policy of its own; it's the same "quote deleted"
--    path either way, so the FK cascade cleans up line items here too.
--    Chosen over an "archive instead of delete" approach at the user's
--    explicit request — this is a real, irreversible deletion once a
--    project crosses 12 months with no save activity.

create or replace function public.amblux_quotes_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists amblux_quotes_touch_updated_at on public.amblux_quotes;
create trigger amblux_quotes_touch_updated_at
  before update on public.amblux_quotes
  for each row
  execute function public.amblux_quotes_touch_updated_at();

create policy "users can delete their own amblux_quotes"
  on public.amblux_quotes for delete
  to authenticated
  using (account_id = auth.uid());

create extension if not exists pg_cron;

select cron.schedule(
  'amblux-quotes-12-month-retention',
  '0 9 * * *',
  $$delete from public.amblux_quotes where updated_at < now() - interval '12 months';$$
);
