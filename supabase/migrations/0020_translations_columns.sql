-- Adds locale-override storage for the two tables that back the public
-- product pages. English stays the base row (name, hero_summary,
-- marketing_paragraphs, features, applications, required_accessories,
-- label, short_description, spec, ...) — nothing about those columns
-- changes. `translations` is an empty jsonb object for every row today;
-- it's meant to be filled in later, per locale, as:
--   { "fr": { "name": "...", "hero_summary": "...", "spec": [...] },
--     "es": { "name": "...", ... } }
-- keyed by the exact same field names as the English base columns, with
-- array-type fields (spec, marketing_paragraphs, features, applications,
-- required_accessories) replaced as a whole array rather than merged
-- element-by-element. Any field/locale not present here just falls back to
-- the English base column (see lib/i18n/localize.ts) — so this can be
-- filled in incrementally, one page or one field at a time, without ever
-- leaving a blank spot on the live site.

alter table public.amblux_product_pages
  add column translations jsonb not null default '{}'::jsonb;

alter table public.amblux_products
  add column translations jsonb not null default '{}'::jsonb;
