-- Real supplier FOB costs for the Flexible Silicone 10x10mm (SR1010)
-- family, replacing the placeholder figures seeded in migration 0007.
-- Confirmed directly: $10.50/1.5m, $20.46/3m, $31.96/5m for this series.
-- The 1.5m figure is intentionally NOT applied here — AMBLUX doesn't
-- currently sell a 1.5m SR1010 variant (catalog only has 3m and 5m for
-- this family) and was asked not to add one, so that number is unused for
-- now. Only the two existing 3m SKUs (3000K/4000K) and the one existing
-- 5m SKU (3000K only — there's no 4000K 5m variant in the catalog) are
-- updated. AMB-FCST-SR1010-45DEG -CLIPS (the unrelated install-clips
-- accessory for this family) is untouched.
--
-- Does not itself change any published price — amblux_pricing only
-- updates the next time amblux_recalculate_pricing() runs (on-demand by
-- design, per migration 0007).

update public.amblux_product_cost
set fob_usd = 20.46,
    is_estimated = false,
    notes = null,
    updated_at = now()
where sku in (
  'AMB-FCST-SR1010-45DEG -24V-30-24-90-3M-27W',
  'AMB-FCST-SR1010-45DEG -24V-40-24-90-3M-27W'
);

update public.amblux_product_cost
set fob_usd = 31.96,
    is_estimated = false,
    notes = null,
    updated_at = now()
where sku = 'AMB-FCST-SR1010-45DEG -24V-30-24-90-5M-45W';
