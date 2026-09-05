-- Root-cause fix for: SKU-scoped pricing overrides in /admin/pricing
-- silently failed to save. The admin panel reported "change all dealer
-- margins to 0.50" as impossible — every override kept reverting to its
-- old value (0.45) on reload after an apparently successful save.
--
-- Root cause: amblux_pricing_parameters_scope_key_unique (migration 0007)
-- is a *partial* unique index — `on (scope, scope_key) where scope <>
-- 'global'`. The admin panel's upsertScopedParametersAction calls
-- supabase-js `.upsert(row, { onConflict: "scope,scope_key" })`, which
-- PostgREST turns into `INSERT ... ON CONFLICT (scope, scope_key) DO
-- UPDATE ...` with no WHERE predicate. Postgres cannot use a *partial*
-- unique index as the ON CONFLICT arbiter unless the ON CONFLICT clause
-- itself repeats the same WHERE predicate — which PostgREST's upsert
-- never adds. So every one of these upserts has been throwing
-- `42P10: there is no unique or exclusion constraint matching the ON
-- CONFLICT specification` (confirmed by reproducing the exact statement
-- directly against production). The action code never checked the
-- Supabase client's `error` result, so the failure was swallowed
-- entirely: the request still "succeeds" from the browser's point of
-- view (panel closes, no error shown), and the page reload just shows
-- the never-updated row.
--
-- Fix, part 1: replace the partial index with a plain (non-partial)
-- unique index on (scope, scope_key). This is safe for the global row —
-- scope_key is NULL there, and Postgres never treats two NULLs as equal
-- for uniqueness — and the pre-existing
-- amblux_pricing_parameters_one_global partial index (on `scope` alone,
-- where scope = 'global') already guarantees at most one global row
-- independently of this one. Category/SKU-scoped rows keep exactly the
-- same one-row-per-(scope, scope_key) guarantee as before; only the ON
-- CONFLICT inference changes.
drop index if exists public.amblux_pricing_parameters_scope_key_unique;
create unique index amblux_pricing_parameters_scope_key_unique
  on public.amblux_pricing_parameters (scope, scope_key);

-- Fix, part 2: the original request — dealer margin at 0.50 for every
-- product. The global row was already 0.50 (so every non-overridden SKU
-- already priced at 50%), but all 44 SKU-scoped overrides had their own
-- dealer_margin_pct frozen at 0.45 from when they were created, and a
-- SKU override always wins over global. Since the override save path was
-- broken (see above), these could never be corrected through the admin
-- UI. Only dealer_margin_pct is touched here — every other field on each
-- override (freight, duty, QC buffer, etc., which exist precisely
-- because that SKU's landed cost genuinely differs) is left exactly as
-- it was.
update public.amblux_pricing_parameters
set dealer_margin_pct = 0.50, updated_at = now()
where scope = 'sku';

-- Note: this only updates the stored parameters. Published prices in
-- amblux_pricing are still whatever they were last computed as, per this
-- project's deliberate on-demand-only recalculation design (migration
-- 0007) — an admin still needs to click "Recalculate & publish prices"
-- (or call amblux_recalculate_pricing()) to push these into live CAD/USD
-- prices for every tier.
