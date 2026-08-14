-- One-sentence hero summaries for amblux_product_pages, matching the tone of
-- the original recovered page's "product-short" paragraph (e.g. "Freecut
-- recessed silicone LED tape with a 6 mm x 6 mm profile, 24 V, CRI 90 and
-- 9 W/m. Select 3000 K or 4000 K in 1.5 m or 3 m lengths."). Deliberately a
-- separate column from marketing_paragraphs (the long-form product story) and
-- from amblux_products.short_description (a terse per-SKU spec string used
-- internally, e.g. in the admin parts list) -- neither was fit for the hero.
alter table public.amblux_product_pages
  add column if not exists hero_summary text;

comment on column public.amblux_product_pages.hero_summary is
  'One-sentence marketing summary shown under the H1 in the product hero, family-level (not per-SKU).';

update public.amblux_product_pages set hero_summary = 'Freecut recessed silicone LED tape with a 6 mm x 6 mm profile, 24 V, CRI 90 and 9 W/m. Select 3000 K or 4000 K in 1.5 m or 3 m lengths.' where slug = 'silicone-6x6';
update public.amblux_product_pages set hero_summary = 'Freecut recessed silicone LED tape with a 4 mm x 8.5 mm translucent-trim profile, 24 V and 6 W/m. Select 3000 K or 4000 K in 3 m lengths.' where slug = 'silicone-4x8.5-trim';
update public.amblux_product_pages set hero_summary = 'Freecut rigid recessed solder-free linear bar, 10 mm x 15 mm profile, 24 V, CRI 90 and 12 W/m. Select 3000 K or 4000 K in 2.4 m pieces.' where slug = 'rigid-10x15';
update public.amblux_product_pages set hero_summary = 'Freecut rigid recessed solder-free linear bar, 6 mm x 8 mm profile, 24 V, CRI 90 and 7.5 W/m. Select 3000 K or 4000 K in 2.4 m pieces.' where slug = 'rigid-6x8';
update public.amblux_product_pages set hero_summary = 'Freecut recessed silicone LED tape with a 10 mm x 10 mm 45° profile, 24 V, CRI 90 and 9 W/m. Select 3000 K or 4000 K in 3 m or 5 m lengths.' where slug = 'silicone-10x10-45deg';
update public.amblux_product_pages set hero_summary = 'Freecut rigid 45° surface-mounted solder-free linear bar, 24 V, CRI 90 and 12 W/m, in 2.4 m pieces.' where slug = 'rigid-45deg-surface';
update public.amblux_product_pages set hero_summary = 'Freecut rigid surface-mounted solder-free linear bar, 16 mm x 10 mm profile, 24 V, CRI 90 and 12 W/m. Select 3000 K or 4000 K in 2.4 m pieces.' where slug = 'rigid-16x10-surface';
update public.amblux_product_pages set hero_summary = 'Recessed puck light, 58 mm, CRI 90, 24 V, 3.5 W, with an integrated switch for 3000 K, 4000 K, or 5000 K. Choose a white, satin nickel, or black faceplate.' where slug = 'recessed-puck';
update public.amblux_product_pages set hero_summary = 'Slim surface or recessed puck light, CRI 90, 24 V, 2 W, with an integrated switch for 3000 K, 4000 K, or 5000 K. Available in white or chrome.' where slug = 'surface-puck';
update public.amblux_product_pages set hero_summary = 'The plug-and-play hub for lighting, dimming, and sensor controls. Available in 24 W, 36 W, 60 W, and 96 W, cULus-certified for North America.' where slug = 'central-control-driver';
update public.amblux_product_pages set hero_summary = 'Wired door, motion, and touch-dimmer switches that plug directly into an AMBLUX Central Control driver -- no separate receiver required.' where slug = 'wired-sensor-controls';
update public.amblux_product_pages set hero_summary = 'Wireless door and motion sensor switches for the AMBLUX Central Control system, paired with the AMB-WRLSS-SS-RCVR receiver.' where slug = 'wireless-sensor-controls';
update public.amblux_product_pages set hero_summary = 'Kinetic RF switches and the AMBLUX Bluetooth app for wireless dimming control, paired with the AMB-DMG-WRLSS-RCVR receiver.' where slug = 'wireless-dimming-controls';
