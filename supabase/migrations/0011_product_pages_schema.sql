-- Public product family pages — one page per product family (e.g. "Freecut
-- Recess Silicone LED Tape 6x6mm"), each with an optional variant picker
-- across the real SKUs that belong to it (length/CCT for linear runs,
-- wattage for drivers, finish for pucks, etc.).
--
-- Design reference: the user recovered the original ChatGPT-built site's
-- actual product page (index.html/styles.css/NOTES.md for
-- /products/freecut-silicone-6x6) directly from its live DOM/CSSOM. This
-- schema mirrors that page's real content sections one-for-one: hero +
-- variant configurator, product story (marketing paragraphs), recommended
-- applications, features/benefits grid, technical specifications table,
-- required/optional accessories.
--
-- Deliberately a separate table from amblux_linear_families rather than
-- extending it: amblux_linear_families is configurator-logic data (the
-- engine reads mounting/watts_per_metre/install_accessory_sku from it) and
-- shouldn't be mixed with marketing/presentation content. This table only
-- adds page content, and optionally links back to a linear family via
-- linear_family_id for the 7 families that have one.
create table public.amblux_product_pages (
  slug text primary key,
  -- Broad grouping used by the /products index page, not the configurator's
  -- amblux_products.category (which is calculation-relevant and finer-grained).
  category text not null check (category = any (array['linear', 'puck', 'driver', 'control', 'accessory'])),
  eyebrow text not null,
  name text not null,
  -- Ordered content — arrays preserve display order, matching the original
  -- page's paragraph order / numbered feature cards / spec table row order
  -- exactly rather than needing a sort column per row.
  marketing_paragraphs jsonb not null default '[]'::jsonb,
  features jsonb not null default '[]'::jsonb,
  applications jsonb not null default '[]'::jsonb,
  -- Array of {title, body} or {title, items:[...]} cards — mirrors the
  -- original page's "Required accessories" numbered-card section exactly
  -- (e.g. "1. Compatible 24V driver" / "2. Choose one compatible control method").
  required_accessories jsonb not null default '[]'::jsonb,
  -- Plain SKU-like codes shown as inert text (matches the original page:
  -- these render as <code> with no link, some aren't real amblux_products
  -- rows at all — e.g. AMB-EXT-1M, a small wire accessory never wired into
  -- the configurator engine).
  optional_accessory_codes jsonb not null default '[]'::jsonb,
  -- Which amblux_products.variant_options keys this family's page exposes
  -- as picker button-groups, in display order, e.g.
  -- [{"key":"length","label":"Length"},{"key":"cct","label":"Colour temperature"}].
  -- Empty for single-SKU pages (no picker shown, matches families with only
  -- one real variant).
  variant_axes jsonb not null default '[]'::jsonb,
  hero_image_url text,
  linear_family_id text references public.amblux_linear_families(id),
  default_sku text references public.amblux_products(sku),
  sort_order integer not null default 0,
  status text not null default 'active' check (status = any (array['active', 'hidden'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.amblux_product_pages is
  'Public product family pages (marketing content + spec-table shape), one row per family. Not pricing-sensitive — safe to read publicly, same as amblux_products.';

alter table public.amblux_product_pages enable row level security;

create policy "amblux_product_pages are readable per status or by admins"
  on public.amblux_product_pages for select
  to anon, authenticated
  using (status <> 'hidden' or private.amblux_is_admin());

-- Links each SKU to the family page it appears on as a variant, and carries
-- the picker-axis values for that variant. variant_options is deliberately
-- generic (not the existing typed mounting/cct/length_m columns, which stay
-- configurator-only) so any category can have a picker — e.g.
-- {"wattage":"24W"} for drivers, {"finish":"White"} for pucks — without
-- forcing every category through linear-specific columns.
alter table public.amblux_products
  add column if not exists page_slug text references public.amblux_product_pages(slug),
  add column if not exists variant_options jsonb not null default '{}'::jsonb;

comment on column public.amblux_products.page_slug is
  'Which amblux_product_pages row this SKU is a variant of, if any.';
comment on column public.amblux_products.variant_options is
  'Picker-axis key/value pairs for this SKU on its product page, e.g. {"length":"1.5 m","cct":"3000 K"}.';
comment on column public.amblux_products.spec is
  'Ordered technical-specification rows for this SKU''s product page, as a JSON array of {"label":...,"value":...} objects — same shape/order as the original site''s spec <dl>.';

create index if not exists amblux_products_page_slug_idx on public.amblux_products (page_slug);
