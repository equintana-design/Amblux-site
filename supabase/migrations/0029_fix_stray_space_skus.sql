-- Fixes ~15 amblux_products SKUs that carry a stray embedded space
-- (originally preserved verbatim from the recovered source data — see
-- catalog.ts's LINEAR_FAMILIES comment on RC1015TR/SM1610's 4000K variants
-- — now confirmed by the business owner to be a real typo, not a genuine
-- catalog string, and cleaned up here to match its sibling SKUs that were
-- already space-free). Also normalizes the two "N2N Cbl 15MM" connector
-- SKUs (SM-45DEG / SM1610 families) to the same dash-only, all-caps
-- convention every other SKU in the catalog follows.
--
-- amblux_products.sku is a primary key referenced by amblux_pricing.
-- product_sku and amblux_product_cost.sku, neither ON UPDATE CASCADE, so a
-- bare UPDATE of the parent key would fail with a foreign-key violation.
-- Each SKU is instead cloned under its corrected spelling, every
-- referencing child row is re-pointed at the clone, and only then is the
-- old row dropped.
do $$
declare
  mapping text[][] := array[
    array['AMB-FCRGL-RC1015TR -24V-40-24-90-2.4M-28.8W', 'AMB-FCRGL-RC1015TR-24V-40-24-90-2.4M-28.8W'],
    array['AMB-FCRGL-RC1015TR -90DEG-CON',                'AMB-FCRGL-RC1015TR-90DEG-CON'],
    array['AMB-FCRGL-RC1015TR -BRKT',                     'AMB-FCRGL-RC1015TR-BRKT'],
    array['AMB-FCRGL-RC1015TR -N2N-CON',                  'AMB-FCRGL-RC1015TR-N2N-CON'],
    array['AMB-FCRGL-SM-45DEG -24V-30-24-90-2.4M-28.8W',  'AMB-FCRGL-SM-45DEG-24V-30-24-90-2.4M-28.8W'],
    array['AMB-FCRGL-SM-45DEG -BRKT',                     'AMB-FCRGL-SM-45DEG-BRKT'],
    array['AMB-FCRGL-SM-45DEG -N2N Cbl 15MM',              'AMB-FCRGL-SM-45DEG-N2N-CBL-15MM'],
    array['AMB-FCRGL-SM1610 -24V-40-24-90-2.4M-28.8W',    'AMB-FCRGL-SM1610-24V-40-24-90-2.4M-28.8W'],
    array['AMB-FCRGL-SM1610 -BRKT',                       'AMB-FCRGL-SM1610-BRKT'],
    array['AMB-FCRGL-SM1610 -N2N-CON',                    'AMB-FCRGL-SM1610-N2N-CON'],
    array['AMB-FCRGL-SM1610-N2N Cbl 15MM',                 'AMB-FCRGL-SM1610-N2N-CBL-15MM'],
    array['AMB-FCST-SR1010-45DEG -24V-30-24-90-3M-27W',   'AMB-FCST-SR1010-45DEG-24V-30-24-90-3M-27W'],
    array['AMB-FCST-SR1010-45DEG -24V-30-24-90-5M-45W',   'AMB-FCST-SR1010-45DEG-24V-30-24-90-5M-45W'],
    array['AMB-FCST-SR1010-45DEG -24V-40-24-90-3M-27W',   'AMB-FCST-SR1010-45DEG-24V-40-24-90-3M-27W'],
    array['AMB-FCST-SR1010-45DEG -CLIPS',                 'AMB-FCST-SR1010-45DEG-CLIPS']
  ];
  old_sku text;
  new_sku text;
begin
  for i in 1 .. array_length(mapping, 1) loop
    old_sku := mapping[i][1];
    new_sku := mapping[i][2];

    if exists (select 1 from amblux_products where sku = old_sku) and not exists (select 1 from amblux_products where sku = new_sku) then
      insert into amblux_products (
        sku, category, family_id, label, short_description, mounting, cct,
        length_m, watts, spec, status, created_at, updated_at, image_url,
        page_slug, variant_options, translations
      )
      select
        new_sku, category, family_id, label, short_description, mounting, cct,
        length_m, watts, spec, status, created_at, now(), image_url,
        page_slug, variant_options, translations
      from amblux_products
      where sku = old_sku;
    end if;

    update amblux_pricing set product_sku = new_sku where product_sku = old_sku;
    update amblux_product_cost set sku = new_sku where sku = old_sku;
    update amblux_quote_line_items set sku = new_sku where sku = old_sku;
    update amblux_pricing_parameters set scope_key = new_sku where scope = 'sku' and scope_key = old_sku;
    update amblux_product_pages set default_sku = new_sku where default_sku = old_sku;
    update amblux_linear_families set power_cord_sku = new_sku where power_cord_sku = old_sku;
    update amblux_linear_families set install_accessory_sku = new_sku where install_accessory_sku = old_sku;

    delete from amblux_products where sku = old_sku;
  end loop;
end $$;
