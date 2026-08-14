-- Two changes requested after seeing the pages live:
--   1. Split the single 'linear' category into 'silicone-linear' and
--      'rigid-linear' so the /products index shows them as two separate
--      groups instead of one lumped "Linear lighting" section — matches
--      the eyebrow text ("Silicone linear" / "Rigid linear") already used
--      on each page.
--   2. Put every real accessory SKU (power cords, installation brackets,
--      clips, puck faceplates — the ones with actual amblux_products rows,
--      cost data, and usually a photo) into one shared 'accessory' page,
--      so they show up as a single "Accessories" category rather than
--      being scattered invisibly inside other families' required/optional
--      accessory text. The still-phantom wire SKUs (AMB-EXT-1M, AMB-Y-EXT,
--      AMB-2M-6PRTDS, AMB-HRW-CBLKT, AMB-FRNT-SWITCH — no cost rows, not
--      real catalog items) are left out of this page for the same reason
--      they were left off the family pages: nothing to show for them yet.
--
-- Constraint dropped before the category data is rewritten and re-added
-- after -- adding the widened CHECK first would fail immediately against
-- the still-'linear' rows.
alter table public.amblux_product_pages drop constraint amblux_product_pages_category_check;

update public.amblux_product_pages set category = 'silicone-linear'
  where slug in ('silicone-6x6', 'silicone-4x8.5-trim', 'silicone-10x10-45deg');
update public.amblux_product_pages set category = 'rigid-linear'
  where slug in ('rigid-10x15', 'rigid-6x8', 'rigid-45deg-surface', 'rigid-16x10-surface');

alter table public.amblux_product_pages add constraint amblux_product_pages_category_check
  check (category = any (array['silicone-linear', 'rigid-linear', 'puck', 'driver', 'control', 'accessory']));

insert into public.amblux_product_pages
  (slug, category, eyebrow, name, hero_summary, marketing_paragraphs, sort_order)
values (
  'accessories',
  'accessory',
  'Accessories',
  'Accessories & Replacement Parts',
  'Power cords, installation brackets, clips, and puck faceplates for every AMBLUX linear and puck family — sold separately from the fixtures they support.',
  '["These are the individual replacement and installation parts behind every AMBLUX fixture: the power cord that ships with a linear run, the bracket that secures it, the faceplate that finishes a recessed puck. Order them on their own for a repair, a spare, or a finish change without replacing the whole fixture."]'::jsonb,
  90
);

update public.amblux_products set page_slug = 'accessories', variant_options = '{}'::jsonb
  where sku in (
    'AMB-EXT-2M',
    'AMB-FCRGL-RC0608TR-PC-1.5M',
    'AMB-FCRGL-RC1015TR -BRKT',
    'AMB-FCRGL-RC1015TR-PC-1.5M',
    'AMB-FCRGL-SM-45DEG -BRKT',
    'AMB-FCRGL-SM-45DEG-PC-1.5M',
    'AMB-FCRGL-SM1610 -BRKT',
    'AMB-FCRGL-SM1610-PC-1.5M',
    'AMB-FCST-SR1010-45DEG -CLIPS',
    'AMB-PK-RC58-FACEPLATE-BK',
    'AMB-PK-RC58-FACEPLATE-SN',
    'AMB-PK-RC58-FACEPLATE-WH'
  );
