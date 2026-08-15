-- Wireless Sensor Switches (wireless-sensor-controls) and Wireless Dimming
-- — Kinetic RF & Bluetooth App (wireless-dimming-controls) each currently
-- present their receiver as just one more equal "Control type" button,
-- with default_sku even pointing at the receiver itself. In reality (and
-- already correctly modelled in lib/configurator/catalog.ts's
-- receiverSku()/DIMMING_RECEIVER_CONTROLS/SENSOR_RECEIVER_CONTROLS, used by
-- the real Configurator engine) every controller on these two pages needs
-- its receiver — the receiver is never an alternative, it's always
-- required alongside whichever controller is chosen ("double selection").
--
-- Fixes:
--   1. Tag each receiver row's variant_options with role: "receiver" so the
--      frontend can pull it out of the selectable "Control type" button
--      group and render it as a fixed, always-included part instead.
--   2. Move default_sku off the receiver and onto a real controller for
--      each page, so the page loads showing a controller by default (the
--      receiver still always displays, just not as "the selected variant").
--   3. Trim the now-redundant "...also require the receiver" clause from
--      each page's required_accessories prose, since the receiver gets its
--      own dedicated, always-visible card on the page now.

update public.amblux_products
set variant_options = variant_options || '{"role": "receiver"}'::jsonb
where sku in ('AMB-WRLSS-SS-RCVR', 'AMB-DMG-WRLSS-RCVR');

update public.amblux_product_pages
set default_sku = 'AMB-WRLSS-SS-TOUCH-DMR'
where slug = 'wireless-sensor-controls';

update public.amblux_product_pages
set default_sku = 'AMB-APP'
where slug = 'wireless-dimming-controls';

update public.amblux_product_pages
set required_accessories = '[{"title": "Requires", "body": "One of the AMBLUX Central Control drivers (24W / 36W / 60W / 96W), sized to your connected wattage.", "links": [{"slug": "central-control-driver", "label": "Central Control drivers"}]}]'::jsonb
where slug = 'wireless-sensor-controls';

update public.amblux_product_pages
set required_accessories = '[{"title": "Requires", "body": "One of the AMBLUX Central Control drivers (24W / 36W / 60W / 96W), sized to your connected wattage.", "links": [{"slug": "central-control-driver", "label": "Central Control drivers"}]}]'::jsonb
where slug = 'wireless-dimming-controls';
