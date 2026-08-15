-- Backs the new admin product-page editor (/admin/products): grants
-- admin-only write access to the two content tables it edits, and creates
-- a public storage bucket for uploaded product/hero photos (uploads are
-- admin-only; reads are public, same as every other product image on the
-- site, most of which currently live on Google Drive instead).

-- amblux_product_pages / amblux_products previously had SELECT-only RLS —
-- nothing (not even an admin) could write to them through the browser,
-- only through a service-role migration. Add admin-gated UPDATE so the
-- editor can save through the signed-in admin's own session.
create policy "admins can update amblux_product_pages"
on amblux_product_pages for update
to authenticated
using (private.amblux_is_admin())
with check (private.amblux_is_admin());

create policy "admins can update amblux_products"
on amblux_products for update
to authenticated
using (private.amblux_is_admin())
with check (private.amblux_is_admin());

-- Public bucket for product photos uploaded through the admin editor —
-- public=true serves objects at a stable public URL with no auth needed
-- (same as how the site already links Google Drive image URLs), while the
-- RLS policies below still gate who may write into it.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'product-images');

create policy "admins can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and private.amblux_is_admin());

create policy "admins can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and private.amblux_is_admin())
with check (bucket_id = 'product-images' and private.amblux_is_admin());

create policy "admins can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and private.amblux_is_admin());
