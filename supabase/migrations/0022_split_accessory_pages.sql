-- Splits the single grouped /products/accessories page into one dedicated
-- product_pages row per accessory/replacement-part SKU, so every accessory
-- gets its own URL/hero/spec page and can be added to a saved project like
-- any of the 13 family pages (per the user's explicit choice over the
-- grouped-grid alternative). The old shared 'accessories' row is retired at
-- the end once nothing references it any more.

insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcrgl-rc1015tr-90deg-con', 'accessory', 'Connectors', '90° corner connector', 'Freecut Rigid Recess Solder-free Linear Solution, "L" shape connector — PC, milky white light diffusion', 'https://drive.google.com/uc?export=view&id=1rIsiY0R_3fTNFrTfEfTiq25ynVVvZax_', 'AMB-FCRGL-RC1015TR -90DEG-CON', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcrgl-rc1015tr-n2n-con', 'accessory', 'Connectors', 'End-to-end connector', 'Freecut Rigid Recess Solder-free end-to-end connector — PC, milky white light diffusion', 'https://drive.google.com/uc?export=view&id=1mN0xedZ6rF5H_bGCfI6MXIQjjLEjqHyH', 'AMB-FCRGL-RC1015TR -N2N-CON', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcrgl-sm-45deg-n2n-cbl-15mm', 'accessory', 'Connectors', 'End-to-end cable · 15 mm', '2 m 24AWG white cable with end cap at both sides — PC, transparent', 'https://drive.google.com/uc?export=view&id=13vuGdqYn1Y6e9q2yKu3S_0yM4JiAe-nW', 'AMB-FCRGL-SM-45DEG -N2N Cbl 15MM', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcrgl-sm1610-n2n-con', 'accessory', 'Connectors', 'End-to-end connector', 'Freecut surface-mount end-to-end connector — PC, milky white light diffusion', 'https://drive.google.com/uc?export=view&id=1FHppZixLXXJO8QOhVeqIyEuVEBUxw5V0', 'AMB-FCRGL-SM1610 -N2N-CON', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcrgl-sm1610-n2n-cbl-15mm', 'accessory', 'Connectors', 'End-to-end cable · 15 mm', '2 m 24AWG white cable with end cap at both sides — PC, transparent', 'https://drive.google.com/uc?export=view&id=1wIh2hK1gWYe1ZrLYAxmZPFEtEs61lCEw', 'AMB-FCRGL-SM1610-N2N Cbl 15MM', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-2m-6prtds', 'accessory', 'Extension cords', '6-port distributor with 2 m cord', '6 port distributor with 2M extension cable, 5 per bag', 'https://drive.google.com/uc?export=view&id=1rjoJ-zupSZ4SdPSnAFIMSbLW842DZFoY', 'AMB-2M-6PRTDS', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-ext-1m', 'accessory', 'Extension cords', '1 m extension cord', 'Extension cable 1M, 5 per bag', 'https://drive.google.com/uc?export=view&id=1r8haa6067bgHh8zkJmBOvKGMbGkUzx3S', 'AMB-EXT-1M', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-ext-2m', 'accessory', 'Extension cords', '2m extension cord', 'Extension Cable 2M, 5 per bag', 'https://drive.google.com/uc?export=view&id=1PKvMVSXmHCMIdgWfYnt8M_TrYdCBFagn', 'AMB-EXT-2M', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-hrw-cblkt', 'accessory', 'Extension cords', 'Hardwire connection kit', 'Male and female connection to terminal for hardwire connectivity to light system, 5 per bag', NULL, 'AMB-HRW-CBLKT', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-y-ext', 'accessory', 'Extension cords', 'Y splitter · 150 mm', '150mm Y splitter, 5 per bag', 'https://drive.google.com/uc?export=view&id=1HcrnCPE_xYM2M_vN4TH4Clop8XXJqXe3', 'AMB-Y-EXT', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-pk-rc58-faceplate-bk', 'accessory', 'Faceplates', 'Recessed puck faceplate — black', '24V Faceplate for Puck Light Pro puck recessed Black', 'https://drive.google.com/uc?export=view&id=1PJTh19aojoDzDa9Az_i5cfHOWMCWDlv3', 'AMB-PK-RC58-FACEPLATE-BK', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-pk-rc58-faceplate-sn', 'accessory', 'Faceplates', 'Recessed puck faceplate — satin nickel', '24V Faceplate for Puck Light Pro puck recessed Satin Nickel', 'https://drive.google.com/uc?export=view&id=1a0HqZDB_dIUzdz2QpmPTxzoqxiVATOTL', 'AMB-PK-RC58-FACEPLATE-SN', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-pk-rc58-faceplate-wh', 'accessory', 'Faceplates', 'Recessed puck faceplate — white', '24V Faceplate for Puck Light Pro puck recessed white', 'https://drive.google.com/uc?export=view&id=1V7JpP3gJUIkQt_TzczQuKNJYqJMNijcU', 'AMB-PK-RC58-FACEPLATE-WH', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcrgl-rc1015tr-brkt', 'accessory', 'Installation accessories', 'Installation bracket · 10-pack (with screws)', 'Freecut Rigid Recess stainless steel installation bracket 10pcs (with screws)', 'https://drive.google.com/uc?export=view&id=1VbIv4UJF80ROLGCIQBra2zs-pJRQDx8S', 'AMB-FCRGL-RC1015TR -BRKT', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcrgl-sm-45deg-brkt', 'accessory', 'Installation accessories', 'Installation bracket · 10-pack (with screws)', 'Freecut Rigid 45 Deg Surface mount stainless steel installation bracket 10pcs (with screws)', NULL, 'AMB-FCRGL-SM-45DEG -BRKT', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcrgl-sm1610-brkt', 'accessory', 'Installation accessories', 'Installation bracket · 10-pack (with screws)', 'Freecut Surface mount stainless steel installation bracket 10pcs (with screws)', 'https://drive.google.com/uc?export=view&id=1w0WY1br9M-6x3qC3WD8h5Fg_vpiXTjV2', 'AMB-FCRGL-SM1610 -BRKT', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcst-sr1010-45deg-clips', 'accessory', 'Installation accessories', 'Clips · 10-pack', 'Recess Silicone LED Tape (10mm by 10mm 45 deg), Clips bag of 10', 'https://drive.google.com/uc?export=view&id=1LmUGfLwN9efF7uCbmLrJNzK7A14SAWre', 'AMB-FCST-SR1010-45DEG -CLIPS', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcrgl-rc0608tr-pc-1-5m', 'accessory', 'Power cords', 'Linear solution power cord — Rigid 6 × 8 mm', 'Freecut Rigid Recess Solder-free Linear Solution, 24v, power cable 1.5M', 'https://drive.google.com/uc?export=view&id=1gZ7OaOdF1Wruc5k1N6sR7KS1R-AY5kur', 'AMB-FCRGL-RC0608TR-PC-1.5M', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcrgl-rc1015tr-pc-1-5m', 'accessory', 'Power cords', 'Linear solution power cord — Rigid 10 × 15 mm', 'Freecut Rigid Recess Solder free Linear Solution, 24v, power cable 1.5M', 'https://drive.google.com/uc?export=view&id=1BULhW-NOaP4EX2PL8WjzeOWdj-NN4zHM', 'AMB-FCRGL-RC1015TR-PC-1.5M', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcrgl-sm-45deg-pc-1-5m', 'accessory', 'Power cords', 'Linear solution power cord — Rigid 45°', 'Freecut Rigid, 24v, power cable 1.5M', NULL, 'AMB-FCRGL-SM-45DEG-PC-1.5M', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-fcrgl-sm1610-pc-1-5m', 'accessory', 'Power cords', 'Linear solution power cord — Rigid 16 × 10 mm', 'Freecut Rigid surface mount Solder free Linear Solution, 24v, power cable 1.5M', 'https://drive.google.com/uc?export=view&id=1KrkAppTFpTXHwbv8zEf_GS2HW-mME9SX', 'AMB-FCRGL-SM1610-PC-1.5M', 90, 'active');
insert into amblux_product_pages (slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, sort_order, status)
values ('amb-frnt-switch', 'accessory', 'Switches', 'Furniture 3-way switch', 'Furniture 3-way switch', 'https://drive.google.com/uc?export=view&id=1GmmE6yZ1q3KgyOTox2gsxJ9WvkUcG3qa', 'AMB-FRNT-SWITCH', 90, 'active');

update amblux_products set page_slug = 'amb-fcrgl-rc1015tr-90deg-con' where sku = 'AMB-FCRGL-RC1015TR -90DEG-CON';
update amblux_products set page_slug = 'amb-fcrgl-rc1015tr-n2n-con' where sku = 'AMB-FCRGL-RC1015TR -N2N-CON';
update amblux_products set page_slug = 'amb-fcrgl-sm-45deg-n2n-cbl-15mm' where sku = 'AMB-FCRGL-SM-45DEG -N2N Cbl 15MM';
update amblux_products set page_slug = 'amb-fcrgl-sm1610-n2n-con' where sku = 'AMB-FCRGL-SM1610 -N2N-CON';
update amblux_products set page_slug = 'amb-fcrgl-sm1610-n2n-cbl-15mm' where sku = 'AMB-FCRGL-SM1610-N2N Cbl 15MM';
update amblux_products set page_slug = 'amb-2m-6prtds' where sku = 'AMB-2M-6PRTDS';
update amblux_products set page_slug = 'amb-ext-1m' where sku = 'AMB-EXT-1M';
update amblux_products set page_slug = 'amb-ext-2m' where sku = 'AMB-EXT-2M';
update amblux_products set page_slug = 'amb-hrw-cblkt' where sku = 'AMB-HRW-CBLKT';
update amblux_products set page_slug = 'amb-y-ext' where sku = 'AMB-Y-EXT';
update amblux_products set page_slug = 'amb-pk-rc58-faceplate-bk' where sku = 'AMB-PK-RC58-FACEPLATE-BK';
update amblux_products set page_slug = 'amb-pk-rc58-faceplate-sn' where sku = 'AMB-PK-RC58-FACEPLATE-SN';
update amblux_products set page_slug = 'amb-pk-rc58-faceplate-wh' where sku = 'AMB-PK-RC58-FACEPLATE-WH';
update amblux_products set page_slug = 'amb-fcrgl-rc1015tr-brkt' where sku = 'AMB-FCRGL-RC1015TR -BRKT';
update amblux_products set page_slug = 'amb-fcrgl-sm-45deg-brkt' where sku = 'AMB-FCRGL-SM-45DEG -BRKT';
update amblux_products set page_slug = 'amb-fcrgl-sm1610-brkt' where sku = 'AMB-FCRGL-SM1610 -BRKT';
update amblux_products set page_slug = 'amb-fcst-sr1010-45deg-clips' where sku = 'AMB-FCST-SR1010-45DEG -CLIPS';
update amblux_products set page_slug = 'amb-fcrgl-rc0608tr-pc-1-5m' where sku = 'AMB-FCRGL-RC0608TR-PC-1.5M';
update amblux_products set page_slug = 'amb-fcrgl-rc1015tr-pc-1-5m' where sku = 'AMB-FCRGL-RC1015TR-PC-1.5M';
update amblux_products set page_slug = 'amb-fcrgl-sm-45deg-pc-1-5m' where sku = 'AMB-FCRGL-SM-45DEG-PC-1.5M';
update amblux_products set page_slug = 'amb-fcrgl-sm1610-pc-1-5m' where sku = 'AMB-FCRGL-SM1610-PC-1.5M';
update amblux_products set page_slug = 'amb-frnt-switch' where sku = 'AMB-FRNT-SWITCH';

-- Now unreferenced by any amblux_products row — safe to remove.
delete from amblux_product_pages where slug = 'accessories';
