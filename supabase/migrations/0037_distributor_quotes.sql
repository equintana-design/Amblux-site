-- Admin tool for generating an initial-order quote TO SEND to a hardware
-- distributor (e.g. Berenson) — the mirror image of the vendor order
-- builder (migration 0036, which is for ordering FROM a supplier). This
-- one shows the distributor what they'd pay Amblux (distributor tier) and
-- what resale margin they'd have against the dealer tier, across any
-- SKUs in the catalog, then lets the admin save it, print/PDF it, export
-- it to CSV, or copy an emailable summary.
--
-- Rather than a new table, this reuses amblux_quotes/amblux_quote_line_items
-- (migration 0001) exactly the way migration 0032 already reused it for
-- "Project" (kind='quick') — same jsonb state/bom shape idea, just a third
-- `kind`. See lib/configurator/distributorQuotes.ts for what `state` holds
-- for this kind (recipient info + line items; no zone/wattage data).

alter table public.amblux_quotes
  drop constraint amblux_quotes_kind_check;

alter table public.amblux_quotes
  add constraint amblux_quotes_kind_check
  check (kind = any (array['configurator'::text, 'quick'::text, 'distributor_quote'::text]));

comment on column public.amblux_quotes.kind is
  'configurator = a full zone-based Configurator save; quick = a Project (formerly "Test Project") save; distributor_quote = an admin-built initial-order quote sent to a hardware distributor (/admin/distributor-quotes).';

-- Every existing write policy on amblux_quotes/amblux_quote_line_items
-- (migration 0001) is scoped to account_id = auth.uid() — fine for a
-- customer saving their own configurator run, but a distributor_quote is
-- authored by an admin on behalf of either an existing distributor
-- account OR a prospect with no account at all (account_id null, same
-- "null = anonymous" convention the table already uses). Neither case
-- satisfies the existing insert/update policies (an admin's auth.uid()
-- isn't the distributor's account_id, and the anon-insert policy only
-- applies to the unauthenticated `anon` role, not a signed-in admin) —
-- so admins need their own explicit write policies, mirroring the existing
-- "admins can read all amblux_quotes" read policy.
create policy "admins can insert any amblux_quotes"
  on public.amblux_quotes for insert
  to authenticated
  with check (private.amblux_is_admin());

create policy "admins can update any amblux_quotes"
  on public.amblux_quotes for update
  to authenticated
  using (private.amblux_is_admin())
  with check (private.amblux_is_admin());

create policy "admins can delete any amblux_quotes"
  on public.amblux_quotes for delete
  to authenticated
  using (private.amblux_is_admin());

create policy "admins can insert any amblux_quote_line_items"
  on public.amblux_quote_line_items for insert
  to authenticated
  with check (private.amblux_is_admin());

create policy "admins can delete any amblux_quote_line_items"
  on public.amblux_quote_line_items for delete
  to authenticated
  using (private.amblux_is_admin());
