-- The admin panel could only ever UPDATE existing amblux_products /
-- amblux_product_pages rows -- there was no INSERT policy for either
-- table, so there was no way to add a genuinely new SKU or product page
-- through the app at all (only a direct database insert could do it).
-- Adds INSERT policies mirroring the existing admin-only UPDATE policies.
create policy "admins can insert amblux_products"
  on public.amblux_products for insert to public
  with check (private.amblux_is_admin());

create policy "admins can insert amblux_product_pages"
  on public.amblux_product_pages for insert to public
  with check (private.amblux_is_admin());
