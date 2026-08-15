-- Re-verified every linear family's watts-per-metre against the source of
-- truth (Google Drive: "AMBLUX Product Sales Sheet Templates.xlsx", the
-- "Linear Solutions" tab's "Wattage per Foot/Meter" column). Every family
-- checks out except rigid-6x8: the spreadsheet says 7.2 W/m for
-- AMB-FCRGL-RC0608TR-... (Application: "Vertical Side panel lighting"
-- only, confirming that family's verticalOnly flag in catalog.ts is also
-- correct). The product pages' own spec table (amblux_products.spec,
-- seeded in 0012) already displayed 7.2 W/m correctly — only three other
-- places still carried the stale 7.5 figure, all fixed here:
--   1. lib/configurator/catalog.ts's LINEAR_FAMILIES/LINEAR_SOLUTIONS
--      wattsPerMetre constant (7.5 -> 7.2) — fixed directly in code, not
--      a DB change, but noted here for the record.
--   2. amblux_linear_families.watts_per_metre — the DB mirror of
--      catalog.ts (see 0004's comment: "safely re-run if catalog.ts
--      changes and needs re-syncing").
--   3. amblux_products.short_description for the two rigid-6x8 SKUs.
--   4. amblux_product_pages.hero_summary for the rigid-6x8 page.

update public.amblux_linear_families
set watts_per_metre = 7.2, updated_at = now()
where id = 'rigid-6x8';

update public.amblux_products
set short_description = 'Freecut Rigid Recess Solder-free Linear Solution 6mm by 8mm, 24v, 90 CRI, 3000K -7.2W/M-2.4m Titanium Grey'
where sku = 'AMB-FCRGL-RC0608TR-24V-30-24-90-2.4M-18W';

update public.amblux_products
set short_description = 'Freecut Rigid Recess Solder free Linear Solution 6mm by 8mm, 24v, 90 CRI, 4000K -7.2W/M-2.4m Titanium Grey'
where sku = 'AMB-FCRGL-RC0608TR-24V-40-24-90-2.4M-18W';

update public.amblux_product_pages
set hero_summary = 'Freecut rigid recessed solder-free linear bar, 6 mm x 8 mm profile, 24 V, CRI 90 and 7.2 W/m. Select 3000 K or 4000 K in 2.4 m pieces.'
where slug = 'rigid-6x8';
