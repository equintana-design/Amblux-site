-- Kitchen Manufacturer vs Kitchen Dealer business type, stored on the
-- account profile so the pricing panel's markup-range estimate (see
-- app/configurator/PricingPanel.tsx) only has to ask once per account
-- rather than once per project. Nullable — existing accounts, and any
-- account that hasn't answered yet, simply don't get an estimate until
-- they pick one (either on /account, or inline the first time they open
-- the "help me estimate" section in the pricing panel).
alter table public.amblux_profiles
  add column business_type text
  check (business_type is null or business_type in ('manufacturer', 'dealer'));
