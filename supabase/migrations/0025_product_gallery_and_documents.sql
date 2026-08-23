-- Adds a small image gallery (up to 3 images total, including the existing
-- hero image) and up to 5 attached documents (spec sheets, install guides,
-- certifications) per product page. Gallery images are page-level, not
-- per-SKU-variant, so the admin only has to upload them once per family
-- rather than once per variant — the existing per-variant image on
-- amblux_products (used by ProductHero's variant picker) is untouched.
--
-- gallery_image_urls: jsonb array of plain URL strings (the two additional
-- images beyond the page's existing hero_image_url).
-- document_urls: jsonb array of {label, url} objects.
alter table public.amblux_product_pages
  add column if not exists gallery_image_urls jsonb not null default '[]'::jsonb,
  add column if not exists document_urls jsonb not null default '[]'::jsonb;

-- New public storage bucket for product documents, mirroring the existing
-- product-images bucket's admin-write / public-read policy shape.
insert into storage.buckets (id, name, public)
values ('product-documents', 'product-documents', true)
on conflict (id) do nothing;

create policy "product documents are publicly readable"
  on storage.objects for select to public
  using (bucket_id = 'product-documents');

create policy "admins can upload product documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-documents' and private.amblux_is_admin());

create policy "admins can update product documents"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-documents' and private.amblux_is_admin())
  with check (bucket_id = 'product-documents' and private.amblux_is_admin());

create policy "admins can delete product documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-documents' and private.amblux_is_admin());
