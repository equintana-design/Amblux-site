-- Seeds the real AMBLUX catalog into amblux_linear_families/amblux_products
-- — every SKU currently hardcoded in lib/configurator/catalog.ts, applied
-- here via apply_migration (bypasses RLS, same as 0001-0003) since the
-- RLS policies deliberately grant no direct client INSERT on these tables
-- (catalog management is meant to go through a service-role-backed admin
-- flow later, not this seed).
--
-- This does NOT include pricing — amblux_pricing stays empty here.
-- Real pricing is still blocked on the pricing-reconciliation decision
-- (two disagreeing sources, paused at your request) — seeding fabricated
-- numbers would be worse than leaving it empty. See migration 0005 for a
-- couple of clearly-marked TEST-only pricing rows used purely to verify
-- the role-gating actually works end-to-end; those are not real prices
-- and are flagged as such everywhere they appear.
--
-- Every row here is idempotent (ON CONFLICT DO UPDATE) so this migration
-- can be safely re-run if catalog.ts changes and needs re-syncing, without
-- needing a new migration file each time during this pre-launch phase.

-- ---------------------------------------------------------------------
-- Linear product families (7) — mirrors catalog.ts LINEAR_FAMILIES exactly.
-- ---------------------------------------------------------------------
insert into public.amblux_linear_families
  (id, label, type, mounting, watts_per_metre, power_cord_sku, install_accessory_sku, install_accessory_label, install_accessory_optional)
values
  ('silicone-6x6', 'Flexible Silicone 6 × 6 mm', 'flexible', 'recess', 9, null, null, null, false),
  ('silicone-4x8.5-trim', 'Flexible Silicone 4 × 8.5 mm translucent trim', 'flexible', 'recess', 6, null, null, null, false),
  ('rigid-10x15', 'Rigid 10 × 15 mm', 'rigid', 'recess', 12, 'AMB-FCRGL-RC1015TR-PC-1.5M', 'AMB-FCRGL-RC1015TR -BRKT', 'Installation bracket', true),
  ('rigid-6x8', 'Rigid 6 × 8 mm', 'rigid', 'recess', 7.5, 'AMB-FCRGL-RC0608TR-PC-1.5M', null, null, false),
  ('silicone-10x10-45deg', 'Flexible Silicone 10 × 10 mm · 45°', 'flexible', 'surface', 9, null, 'AMB-FCST-SR1010-45DEG -CLIPS', 'Clips', false),
  ('rigid-45deg-surface', 'Rigid 45°', 'rigid', 'surface', 12, 'AMB-FCRGL-SM-45DEG-PC-1.5M', 'AMB-FCRGL-SM-45DEG -BRKT', 'Installation bracket', false),
  ('rigid-16x10-surface', 'Rigid 16 × 10 mm', 'rigid', 'surface', 12, 'AMB-FCRGL-SM1610-PC-1.5M', 'AMB-FCRGL-SM1610 -BRKT', 'Installation bracket', false)
on conflict (id) do update set
  label = excluded.label,
  type = excluded.type,
  mounting = excluded.mounting,
  watts_per_metre = excluded.watts_per_metre,
  power_cord_sku = excluded.power_cord_sku,
  install_accessory_sku = excluded.install_accessory_sku,
  install_accessory_label = excluded.install_accessory_label,
  install_accessory_optional = excluded.install_accessory_optional,
  updated_at = now();

-- ---------------------------------------------------------------------
-- Linear pieces (16) — every real (family, CCT, stock length) SKU.
-- Two SKUs carry a literal stray space before "-24V" in the source data
-- (RC1015TR's 4000K variant, SM1610's 4000K variant) — preserved verbatim,
-- matching catalog.ts's own note on this.
-- ---------------------------------------------------------------------
insert into public.amblux_products (sku, category, family_id, label, mounting, cct, length_m, watts, status)
values
  ('AMB-FCST-RC0606-24V-30-24-90-1.5M-13.5W', 'linear_piece', 'silicone-6x6', 'Flexible Silicone 6 × 6 mm · 1.5 m piece', 'recess', '3000', 1.5, 13.5, 'active'),
  ('AMB-FCST-RC0606-24V-40-24-90-1.5M-13.5W', 'linear_piece', 'silicone-6x6', 'Flexible Silicone 6 × 6 mm · 1.5 m piece', 'recess', '4000', 1.5, 13.5, 'active'),
  ('AMB-FCST-RC0606-24V-30-24-90-3M-27W', 'linear_piece', 'silicone-6x6', 'Flexible Silicone 6 × 6 mm · 3 m piece', 'recess', '3000', 3, 27, 'active'),
  ('AMB-FCST-RC0606-24V-40-24-90-3M-27W', 'linear_piece', 'silicone-6x6', 'Flexible Silicone 6 × 6 mm · 3 m piece', 'recess', '4000', 3, 27, 'active'),
  ('AMB-FCST-RC0485TR-24V-30-24-90-3M-18W', 'linear_piece', 'silicone-4x8.5-trim', 'Flexible Silicone 4 × 8.5 mm translucent trim · 3 m piece', 'recess', '3000', 3, 18, 'active'),
  ('AMB-FCST-RC0485TR-24V-40-24-90-3M-18W', 'linear_piece', 'silicone-4x8.5-trim', 'Flexible Silicone 4 × 8.5 mm translucent trim · 3 m piece', 'recess', '4000', 3, 18, 'active'),
  ('AMB-FCRGL-RC1015TR-24V-30-24-90-2.4M-28.8W', 'linear_piece', 'rigid-10x15', 'Rigid 10 × 15 mm · 2.4 m piece', 'recess', '3000', 2.4, 28.8, 'active'),
  ('AMB-FCRGL-RC1015TR -24V-40-24-90-2.4M-28.8W', 'linear_piece', 'rigid-10x15', 'Rigid 10 × 15 mm · 2.4 m piece', 'recess', '4000', 2.4, 28.8, 'active'),
  ('AMB-FCRGL-RC0608TR-24V-30-24-90-2.4M-18W', 'linear_piece', 'rigid-6x8', 'Rigid 6 × 8 mm · 2.4 m piece', 'recess', '3000', 2.4, 18, 'active'),
  ('AMB-FCRGL-RC0608TR-24V-40-24-90-2.4M-18W', 'linear_piece', 'rigid-6x8', 'Rigid 6 × 8 mm · 2.4 m piece', 'recess', '4000', 2.4, 18, 'active'),
  ('AMB-FCST-SR1010-45DEG -24V-30-24-90-3M-27W', 'linear_piece', 'silicone-10x10-45deg', 'Flexible Silicone 10 × 10 mm · 45° · 3 m piece', 'surface', '3000', 3, 27, 'active'),
  ('AMB-FCST-SR1010-45DEG -24V-40-24-90-3M-27W', 'linear_piece', 'silicone-10x10-45deg', 'Flexible Silicone 10 × 10 mm · 45° · 3 m piece', 'surface', '4000', 3, 27, 'active'),
  ('AMB-FCST-SR1010-45DEG -24V-30-24-90-5M-45W', 'linear_piece', 'silicone-10x10-45deg', 'Flexible Silicone 10 × 10 mm · 45° · 5 m piece', 'surface', '3000', 5, 45, 'active'),
  ('AMB-FCRGL-SM-45DEG -24V-30-24-90-2.4M-28.8W', 'linear_piece', 'rigid-45deg-surface', 'Rigid 45° · 2.4 m piece', 'surface', '3000', 2.4, 28.8, 'active'),
  ('AMB-FCRGL-SM1610-24V-30-24-90-2.4M-28.8W', 'linear_piece', 'rigid-16x10-surface', 'Rigid 16 × 10 mm · 2.4 m piece', 'surface', '3000', 2.4, 28.8, 'active'),
  ('AMB-FCRGL-SM1610 -24V-40-24-90-2.4M-28.8W', 'linear_piece', 'rigid-16x10-surface', 'Rigid 16 × 10 mm · 2.4 m piece', 'surface', '4000', 2.4, 28.8, 'active')
on conflict (sku) do update set
  category = excluded.category, family_id = excluded.family_id, label = excluded.label,
  mounting = excluded.mounting, cct = excluded.cct, length_m = excluded.length_m,
  watts = excluded.watts, status = excluded.status, updated_at = now();

-- ---------------------------------------------------------------------
-- Power cords (4) — one per rigid family that has a distinct cord SKU;
-- silicone families come pre-wired (no separate cord product) per the
-- real product list, matching catalog.ts having no powerCordSku for them.
-- ---------------------------------------------------------------------
insert into public.amblux_products (sku, category, family_id, label, status)
values
  ('AMB-FCRGL-RC1015TR-PC-1.5M', 'power_cord', 'rigid-10x15', 'Linear solution power cord — Rigid 10 × 15 mm', 'active'),
  ('AMB-FCRGL-RC0608TR-PC-1.5M', 'power_cord', 'rigid-6x8', 'Linear solution power cord — Rigid 6 × 8 mm', 'active'),
  ('AMB-FCRGL-SM-45DEG-PC-1.5M', 'power_cord', 'rigid-45deg-surface', 'Linear solution power cord — Rigid 45°', 'active'),
  ('AMB-FCRGL-SM1610-PC-1.5M', 'power_cord', 'rigid-16x10-surface', 'Linear solution power cord — Rigid 16 × 10 mm', 'active')
on conflict (sku) do update set
  category = excluded.category, family_id = excluded.family_id, label = excluded.label,
  status = excluded.status, updated_at = now();

-- ---------------------------------------------------------------------
-- Install hardware (4) — real brackets/clips, see 0001's header comment
-- for how these were recovered (the real product list's "Required
-- Accessories" column, not a guess).
-- ---------------------------------------------------------------------
insert into public.amblux_products (sku, category, family_id, label, status)
values
  ('AMB-FCRGL-RC1015TR -BRKT', 'install_accessory', 'rigid-10x15', 'Installation bracket · 10-pack (with screws)', 'active'),
  ('AMB-FCST-SR1010-45DEG -CLIPS', 'install_accessory', 'silicone-10x10-45deg', 'Clips · 10-pack', 'active'),
  ('AMB-FCRGL-SM-45DEG -BRKT', 'install_accessory', 'rigid-45deg-surface', 'Installation bracket · 10-pack (with screws)', 'active'),
  ('AMB-FCRGL-SM1610 -BRKT', 'install_accessory', 'rigid-16x10-surface', 'Installation bracket · 10-pack (with screws)', 'active')
on conflict (sku) do update set
  category = excluded.category, family_id = excluded.family_id, label = excluded.label,
  status = excluded.status, updated_at = now();

-- ---------------------------------------------------------------------
-- Puck lights (3) and recessed faceplates (3) — not part of any linear
-- family (family_id stays null), finish captured in spec since it's not
-- a column the rest of the app filters/sorts on.
-- ---------------------------------------------------------------------
insert into public.amblux_products (sku, category, mounting, watts, spec, label, status)
values
  ('AMB-PK-RC58-24V-345-90-35W-LE', 'puck', 'recess', 3.5, '{"selectableCct": true, "finishes": ["white", "satinNickel", "black"]}'::jsonb, 'Recessed puck light — selectable white', 'active'),
  ('AMB-PK-SLSR35-24V-345-90-2W-WH', 'puck', 'surface', 2, '{"selectableCct": true, "finish": "white"}'::jsonb, 'Surface puck light — white', 'active'),
  ('AMB-PK-SLSR35-24V-345-90-2W-CH', 'puck', 'surface', 2, '{"selectableCct": true, "finish": "chrome"}'::jsonb, 'Surface puck light — chrome', 'active')
on conflict (sku) do update set
  category = excluded.category, mounting = excluded.mounting, watts = excluded.watts,
  spec = excluded.spec, label = excluded.label, status = excluded.status, updated_at = now();

insert into public.amblux_products (sku, category, mounting, spec, label, status)
values
  ('AMB-PK-RC58-FACEPLATE-WH', 'faceplate', 'recess', '{"finish": "white"}'::jsonb, 'Recessed puck faceplate — white', 'active'),
  ('AMB-PK-RC58-FACEPLATE-SN', 'faceplate', 'recess', '{"finish": "satinNickel"}'::jsonb, 'Recessed puck faceplate — satin nickel', 'active'),
  ('AMB-PK-RC58-FACEPLATE-BK', 'faceplate', 'recess', '{"finish": "black"}'::jsonb, 'Recessed puck faceplate — black', 'active')
on conflict (sku) do update set
  category = excluded.category, mounting = excluded.mounting, spec = excluded.spec,
  label = excluded.label, status = excluded.status, updated_at = now();

-- ---------------------------------------------------------------------
-- Extension cord (1), receivers (2), drivers/PSUs (4).
-- ---------------------------------------------------------------------
insert into public.amblux_products (sku, category, label, status)
values
  ('AMB-EXT-2M', 'extension_cord', '2m extension cord', 'active'),
  ('AMB-WRLSS-SS-RCVR', 'receiver', 'LED Wireless receiver', 'active'),
  ('AMB-DMG-WRLSS-RCVR', 'receiver', 'Wireless RF and Bluetooth receiver for Kinetic RF Switches and App', 'active'),
  ('AMB-DRV-24V-24W', 'driver', 'Power supply · 24 W', 'active'),
  ('AMB-DRV-24V-36W', 'driver', 'Power supply · 36 W', 'active'),
  ('AMB-DRV-24V-60W', 'driver', 'Power supply · 60 W', 'active'),
  ('AMB-DRV-24V-96W', 'driver', 'Power supply · 96 W', 'active')
on conflict (sku) do update set
  category = excluded.category, label = excluded.label, status = excluded.status, updated_at = now();

-- ---------------------------------------------------------------------
-- Controls (12 unique SKUs) — mirrors catalog.ts CONTROL_SKU, with two
-- deliberate omissions:
--   - "line" is skipped entirely: it's a literal unresolved placeholder
--     in the recovered source ("REPLACE_WITH_AMBLUX_SKU"), not a real
--     SKU, and this table should never contain a fake product row.
--   - "wireless" is skipped as a separate row because it maps to the
--     exact same real SKU as "remote1Zone" (AMB-DMG-WRLSS-KNT-1ZWS) in
--     catalog.ts — one real product offered under two control-option ids,
--     not two products. The sku primary key means it can only be
--     inserted once regardless.
-- ---------------------------------------------------------------------
insert into public.amblux_products (sku, category, label, status)
values
  ('AMB-APP', 'control', 'Bluetooth App', 'active'),
  ('AMB-DMG-WRLSS-KNT-1ZWS', 'control', 'Kinetic RF switch — 1 gang, 1 zone', 'active'),
  ('AMB-DMG-WRLSS-KNT-2ZWS', 'control', 'Kinetic RF switch — 1 gang, 2 zones', 'active'),
  ('AMB-DMG-WRLSS-KNT-BTN', 'control', 'Compact kinetic RF push-button switch', 'active'),
  ('AMB-WR-SS-TOUCH-DMR', 'control', 'LED wired touch sensor switch and dimmer', 'active'),
  ('AMB-WR-SS-1DOOR', 'control', 'LED wired door-control sensor switch', 'active'),
  ('AMB-WR-SS-2DOOR', 'control', 'LED wired door-control sensor switch for two doors', 'active'),
  ('AMB-WR-SS-MS', 'control', 'LED wired PIR motion-sensor switch', 'active'),
  ('AMB-WR-SS-MS-DN', 'control', 'LED wired PIR motion-sensor switch with day/night sensor', 'active'),
  ('AMB-WRLSS-SS-TOUCH-DMR', 'control', 'LED wireless touch sensor switch and dimmer', 'active'),
  ('AMB-WRLSS-SS-MDOOR', 'control', 'LED wireless door-control sensor switch for single or double doors', 'active'),
  ('AMB-WRLSS-MS', 'control', 'LED wireless PIR motion-sensor switch', 'active')
on conflict (sku) do update set
  category = excluded.category, label = excluded.label, status = excluded.status, updated_at = now();
