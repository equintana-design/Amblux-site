-- Lets "Project" (the renamed former "Test Project" — the no-zone,
-- pick-SKUs-directly bill of materials at /project) reuse the exact same
-- save/reload/delete/12-month-retention system already built for the
-- Configurator, instead of standing up a second, parallel table with its
-- own RLS and retention job to maintain.
--
-- amblux_quotes.state/bom are already schemaless jsonb columns, so the
-- only real gap is telling the two kinds of saved row apart when listing
-- "my saved projects" — a Configurator save's `state` is a full
-- ConfiguratorState (zones, project info, etc.) and its `bom` is the
-- real per-zone BomResult; a Project save's `state` is just
-- { name, items: TestProjectItem[] } and its `bom` is a small synthesized
-- BomResult (one row per picked SKU, so the existing pricing/CSV code
-- paths work unchanged) with no real per-zone wattage behind it.
--
-- Every existing row is a Configurator save (Project saving didn't exist
-- before this), so the new column defaults to 'configurator' and every
-- current row backfills to that value automatically — no data migration
-- needed beyond the column default itself.
alter table public.amblux_quotes
  add column kind text not null default 'configurator'
    check (kind = any (array['configurator'::text, 'quick'::text]));

comment on column public.amblux_quotes.kind is
  'configurator = a full zone-based Configurator save; quick = a Project (formerly "Test Project") save — a flat picked-SKU list with no zone/wattage data behind it.';

-- Every existing RLS policy on this table (select/insert/update/delete,
-- migrations 0001 and 0031) is scoped by account_id only, not kind — a
-- Project save and a Configurator save are both just "a row this account
-- owns," so no policy changes are needed for either to keep working.
-- listMyQuotes()/listMyQuickProjects() (lib/configurator/quotes.ts) filter
-- by kind client-side, at the query level, purely to keep the two lists
-- from mixing in the UI.
