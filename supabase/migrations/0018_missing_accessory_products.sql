-- Fills in 10 real SKUs that were referenced by name across product pages
-- (required_accessories "items" text and optional_accessory_codes chips)
-- but never actually existed as rows in amblux_products — so they rendered
-- as plain, unlinked text instead of a real accessory card, and never
-- showed up on the /products/accessories catalog page at all. Data pulled
-- straight from the Google Drive "AMBLUX Product Sales Sheet Templates"
-- workbook (Accessories tab for the 5 wire accessories; Linear Solutions
-- tab for the 5 rigid-family connectors/cables).
--
-- SKU spelling note: the 5 "wire accessory" SKUs are inserted using the
-- no-space form already used consistently in every page's
-- optional_accessory_codes array (e.g. "AMB-2M-6PRTDS") rather than the
-- spreadsheet's own stray-space form ("AMB-2M -6PRTDS") — matching what's
-- already live on the site is what makes the existing chips resolve to a
-- real link. The 5 linear-connector SKUs go the other way: they keep the
-- exact (including stray-space) spelling already baked into each family
-- page's required_accessories "items" text, since that's the string the
-- link-matching code compares against verbatim.
--
-- Data-quality flag (not fixed here, just noted): the source spreadsheet's
-- short descriptions for AMB-FCRGL-SM-45DEG -N2N Cbl 15MM and
-- AMB-FCRGL-SM1610-N2N Cbl 15MM appear to have their connector-shape
-- descriptions swapped/inconsistent between the two rows (one reads as a
-- straight cable, the other as an "L" shape connector, despite similar
-- "N2N Cbl" naming) — carried over verbatim rather than guessed at.

-- Widen amblux_products_category_check to admit the two new category
-- values these rows need ('connector' for the rigid-family end-to-end/
-- corner connectors and cables, 'switch' for the furniture 3-way switch) —
-- was ['linear_piece','puck','faceplate','driver','control','receiver',
-- 'power_cord','install_accessory','extension_cord'].
alter table public.amblux_products drop constraint amblux_products_category_check;
alter table public.amblux_products add constraint amblux_products_category_check
  check (category = any (array['linear_piece','puck','faceplate','driver','control','receiver','power_cord','install_accessory','extension_cord','connector','switch']));

insert into public.amblux_products
  (sku, category, family_id, label, short_description, page_slug, variant_options, status)
values
  ('AMB-EXT-1M', 'extension_cord', null, '1 m extension cord', 'Extension cable 1M, 5 per bag', 'accessories', '{}'::jsonb, 'active'),
  ('AMB-Y-EXT', 'extension_cord', null, 'Y splitter · 150 mm', '150mm Y splitter, 5 per bag', 'accessories', '{}'::jsonb, 'active'),
  ('AMB-2M-6PRTDS', 'extension_cord', null, '6-port distributor with 2 m cord', '6 port distributor with 2M extension cable, 5 per bag', 'accessories', '{}'::jsonb, 'active'),
  ('AMB-HRW-CBLKT', 'extension_cord', null, 'Hardwire connection kit', 'Male and female connection to terminal for hardwire connectivity to light system, 5 per bag', 'accessories', '{}'::jsonb, 'active'),
  ('AMB-FRNT-SWITCH', 'switch', null, 'Furniture 3-way switch', 'Furniture 3-way switch', 'accessories', '{}'::jsonb, 'active'),
  ('AMB-FCRGL-RC1015TR -90DEG-CON', 'connector', 'rigid-10x15', '90° corner connector', 'Freecut Rigid Recess Solder-free Linear Solution, "L" shape connector — PC, milky white light diffusion', 'accessories', '{}'::jsonb, 'active'),
  ('AMB-FCRGL-RC1015TR -N2N-CON', 'connector', 'rigid-10x15', 'End-to-end connector', 'Freecut Rigid Recess Solder-free end-to-end connector — PC, milky white light diffusion', 'accessories', '{}'::jsonb, 'active'),
  ('AMB-FCRGL-SM-45DEG -N2N Cbl 15MM', 'connector', 'rigid-45deg-surface', 'End-to-end cable · 15 mm', '2 m 24AWG white cable with end cap at both sides — PC, transparent', 'accessories', '{}'::jsonb, 'active'),
  ('AMB-FCRGL-SM1610-N2N Cbl 15MM', 'connector', 'rigid-16x10-surface', 'End-to-end connector · 15 mm', 'Freecut Rigid surface-mount Solder-free Linear Solution, "L" shape connector — PC, milky white light diffusion', 'accessories', '{}'::jsonb, 'active'),
  ('AMB-FCRGL-SM1610 -N2N-CON', 'connector', 'rigid-16x10-surface', 'End-to-end connector', 'Freecut surface-mount end-to-end connector — PC, milky white light diffusion', 'accessories', '{}'::jsonb, 'active')
on conflict (sku) do update set
  category = excluded.category, family_id = excluded.family_id, label = excluded.label,
  short_description = excluded.short_description, page_slug = excluded.page_slug,
  variant_options = excluded.variant_options, status = excluded.status, updated_at = now();
