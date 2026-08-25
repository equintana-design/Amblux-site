-- After the earlier account-role rename (distributor -> client, dealer ->
-- distributor in amblux_profiles.role), this policy was left mapping the
-- OLD pricing-tier names to the NEW role names, using the pre-rename
-- tier<->role pairing. The net effect: the 'distributor' tier (the best
-- price) was granted to every approved role including the lowest 'client'
-- role, and the 'dealer' tier was never actually reachable by anyone in
-- the UI (the frontend only ever queried 'distributor').
--
-- Corrected mapping: 'distributor' tier is for Distributor/Admin accounts
-- only; 'dealer' tier is a Client account's own price (also readable by
-- Distributor/Admin, who can see everything below their own tier). MSRP
-- stays public. This matches the frontend fix in ProductPricing.tsx and
-- PricingPanel.tsx, which now prefer 'distributor' and fall back to
-- 'dealer'.
drop policy if exists "amblux_pricing is readable per tier and role" on public.amblux_pricing;
create policy "amblux_pricing is readable per tier and role"
  on public.amblux_pricing for select to public
  using (
    tier = 'msrp'
    or (tier = 'distributor' and private.amblux_has_approved_role(array['distributor', 'admin']))
    or (tier = 'dealer' and private.amblux_has_approved_role(array['client', 'distributor', 'admin']))
  );
