-- Per the user's explicit request: "if you're not signed in, you can't
-- see any pricing." Previously MSRP alone was public (`tier = 'msrp'`
-- with no auth check, going all the way back to migration 0001, and
-- reconfirmed in 0027) — a deliberate earlier design choice ("the
-- homepage and product catalog stay fully public... anyone can see what
-- AMBLUX makes"), which this migration deliberately reverses: now every
-- tier, MSRP included, requires a signed-in account. Just being signed in
-- is enough for MSRP (no approval requirement, same as before this
-- change) — the Distributor/Dealer tier role/approval restrictions are
-- unchanged.
--
-- Frontend changes to match (ProductPricing.tsx, PricingPanel.tsx —
-- both configurator/ and project/'s reused copy): each now shows a plain
-- "sign in to see pricing" message for a signed-out visitor rather than
-- falling through to whatever RLS happens to return (which, after this
-- migration, is simply nothing).
drop policy if exists "amblux_pricing is readable per tier and role" on public.amblux_pricing;
create policy "amblux_pricing is readable per tier and role"
  on public.amblux_pricing for select to public
  using (
    auth.uid() is not null
    and (
      tier = 'msrp'
      or (tier = 'distributor' and private.amblux_has_approved_role(array['distributor', 'admin']))
      or (tier = 'dealer' and private.amblux_has_approved_role(array['client', 'distributor', 'admin']))
    )
  );
