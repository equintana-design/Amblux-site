-- Pack size (pieces sold together as one orderable unit — e.g. 5 for a
-- 5-pack) for amblux_product_cost, 2026-11-06.
--
-- Built after the first pass of the sub-$1 FOB "sell in packs" feature
-- (owner instruction: "For anything that has FOB less than 1$ add a
-- multiplier, and we will sell them in packs of 5") shipped with the pack
-- size hardcoded as a TypeScript constant (SUBDOLLAR_PACK_SIZE = 5 in
-- lib/configurator/catalog.ts). The owner then asked to be able to choose
-- the multiplier themselves — this column is the editable source of truth,
-- surfaced on /admin/pricing (see app/admin/pricing/FobEditForm.tsx and
-- page.tsx's "Product cost (FOB)" table) and read live by the BOM engine
-- (lib/configurator/engine.ts's computeBom(), via packedQty() in
-- catalog.ts) through lib/configurator/useLivePackSizes.ts client-side and
-- lib/chat/catalogRules.ts server-side (the AI chat assistant's compute_bom
-- tool).
--
-- Defaults to 1 (no packaging change) for every existing SKU; a follow-up
-- data-only update (applied directly via Supabase, not a migration file,
-- matching how this project's other one-off data corrections are handled)
-- set it to 5 for the 13 sub-$1 SKUs already identified. catalog.ts's
-- SUBDOLLAR_PACK_SKUS/SUBDOLLAR_PACK_SIZE constants remain as a static
-- fallback for when this live value hasn't loaded yet (or a SKU has no
-- amblux_product_cost row) — see packedQty()'s own comment.
alter table amblux_product_cost
  add column if not exists pack_size integer not null default 1 check (pack_size >= 1);

comment on column amblux_product_cost.pack_size is
  'Pieces sold together as one orderable unit (e.g. 5 for a 5-pack). Admin-editable on /admin/pricing. The BOM engine (computeBom/packedQty in lib/configurator/catalog.ts + lib/configurator/engine.ts) rounds computed per-piece quantities up to whole packs for any SKU with this set above 1, via a live fetch (lib/configurator/useLivePackSizes.ts client-side, lib/chat/catalogRules.ts server-side).';
