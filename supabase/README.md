# AMBLUX Supabase schema

This is AMBLUX's own dedicated Supabase project — separate from Cabinet
Light Builder's `kcc-production` project, on purpose (see the header
comment in `migrations/0001_amblux_catalog_pricing_quotes.sql` for why).

- Project name: `amblux-production`
- Project ref: `vymtfqgvxhjbhkrgvgol`
- API URL: `https://vymtfqgvxhjbhkrgvgol.supabase.co`
- Publishable (anon) key: `sb_publishable_pgreyoX5yFRKhi7T4eGbRw_4t95GPFI`
  — safe to use client-side / commit; it only grants what the RLS policies
  below allow. The service-role key is not stored anywhere in this repo.

## Status

Schema is applied and tested — `get_advisors` reports zero security
warnings (performance advisors show only INFO-level "unused index"
notices, expected on a low-traffic project and not action items). Live
and wired into the app:

- `@supabase/supabase-js` and `@supabase/ssr` are installed.
  `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (Server
  Components/Actions), and `proxy.ts` + `lib/supabase/middleware.ts`
  (session-cookie refresh, Next.js 16's "Proxy" convention) wire it up.
- The full real catalog (7 linear families, 49 products) is seeded —
  see `migrations/0004_seed_real_catalog.sql`. `catalog.ts` remains the
  source the calculator engine (`lib/configurator/engine.ts`) actually
  computes from, deliberately unchanged — this table is the eventual
  real source once the app fully migrates off the hardcoded array, not
  yet a live override of the calculation logic.
- Distributor auth is live: `/sign-up`, `/sign-in`, `/account` (Server
  Actions in `app/account/actions.ts`). Signing up auto-creates an
  `amblux_profiles` row (`role='distributor'`, `approved=false`) via the
  `on_auth_user_created_amblux` trigger (migration `0003`).
- `/admin/distributors` — a real approve/revoke screen (migration `0006`),
  gated to signed-in accounts with `role='admin'` and `approved=true`. The
  only remaining direct-SQL step is bootstrapping the very first admin
  account (flipping one profile's `role` to `'admin'` once) — after that,
  approving every other distributor is a click, not a database update.
  Migration `0006` also fixed a real bug caught by local + live testing:
  the RLS policy alone let a signed-in distributor call
  `.update({ approved: true })` on their own row and it would have worked,
  since RLS governs which rows an update can touch, not which columns —
  fixed with a trigger that pins `role`/`approved`/`email` back to their
  existing values for any non-admin update, verified against the live
  database with the exact self-approve attempt that would have exploited
  it, both before and after the fix.
- The configurator's `PricingPanel` (`app/configurator/PricingPanel.tsx`)
  is a genuine runtime Supabase read: it queries `amblux_pricing` for the
  BOM's SKUs from the browser, so what comes back is exactly what RLS
  allows for whoever's signed in — msrp for everyone, distributor pricing
  only for an approved distributor/dealer/admin session.
- `migrations/0005_test_pricing_rows.sql` seeds two SKUs with obviously
  fake TEST prices (12.34 / 8.88 and 23.45 / 15.67) so the approve/deny
  pricing gate has something real to show end-to-end before real pricing
  exists. Verified directly against the live database (not just locally):
  a simulated signup auto-created a profile, pricing showed msrp-only
  pre-approval, both tiers after approval, anon stayed msrp-only
  throughout — then the throwaway test account was deleted.
- Real pricing for the rest of the catalog is still blocked on the
  pricing-reconciliation decision (unchanged from earlier).

## What's here

- `migrations/0001_amblux_catalog_pricing_quotes.sql` — the schema itself:
  `amblux_linear_families` / `amblux_products` (catalog, mirrors
  `catalog.ts`'s `LINEAR_FAMILIES`), `amblux_profiles` (distributor/
  dealer/admin accounts), `amblux_pricing` (role-gated msrp/distributor/
  dealer pricing), `amblux_quotes` / `amblux_quote_line_items` (saved
  configurator runs).
- `migrations/0002_amblux_rls_hardening.sql` — a follow-up pass fixing
  what Supabase's own advisors flagged after 0001 was applied: moved two
  `SECURITY DEFINER` role-check helper functions out of the public/API-
  exposed schema (they were reachable as public RPC endpoints), fixed
  several policies re-evaluating `auth.uid()` per row instead of once,
  and consolidated a few redundant permissive policies.
- `migrations/0003_new_user_profile_trigger.sql` — auto-creates an
  `amblux_profiles` row on signup.
- `migrations/0004_seed_real_catalog.sql` — the full real catalog (7
  families, 49 products), diffed programmatically against `catalog.ts`.
- `migrations/0005_test_pricing_rows.sql` — two obviously-fake TEST price
  rows so the pricing gate has something to show before real pricing
  exists.
- `migrations/0006_admin_distributor_approval.sql` — `amblux_profiles.email`
  (denormalized at signup, since `auth.users` isn't PostgREST-exposed), an
  admin update policy, and the column-pinning trigger described above.
- `../lib/supabase/database.types.ts` — TypeScript types generated
  directly from the live schema (`generate_typescript_types`). Regenerate
  this any time the schema changes rather than hand-editing it.

## Both migrations were tested before being applied, not just written

Applied to a real local Postgres 16 instance, seeded with sample data, and
verified under four simulated access levels (anonymous visitor, an
approved distributor, an authenticated user with no profile at all, and an
admin) — confirming each sees exactly the rows it should. That process
caught and fixed a real bug (infinite RLS recursion in the first draft's
admin-check policies) before it ever reached the real project. Also
verified: anonymous `/embed`-style quote inserts work, one distributor
can't see another's quotes, and a distributor can't insert a quote under
someone else's `account_id` (RLS correctly rejects it).

## Deliberately not included

No purchase orders, inventory/warehouses, or accounting tables — those are
the back-office pieces the plan doc earmarks for a possible future ERPNext
integration rather than custom-building here. This schema's job is
catalog + role-based pricing + quotes, nothing more.
