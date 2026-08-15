-- Nine of the ten accessory SKUs added in migration 0018 shipped with no
-- image_url (the product rows were authored from the sales-sheet research
-- pass, before checking whether photos existed yet). All ten already have a
-- dedicated folder in the Drive "master model folder" tree (created back on
-- 2026-06-11, same as every other product's folder) — nine of those folders
-- turned out to already have a photo in them, just never linked into the
-- DB. AMB-HRW-CBLKT's folder is still empty; it's left NULL here pending a
-- real photo.
update amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1rjoJ-zupSZ4SdPSnAFIMSbLW842DZFoY' where sku = 'AMB-2M-6PRTDS';
update amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1r8haa6067bgHh8zkJmBOvKGMbGkUzx3S' where sku = 'AMB-EXT-1M';
update amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1rIsiY0R_3fTNFrTfEfTiq25ynVVvZax_' where sku = 'AMB-FCRGL-RC1015TR -90DEG-CON';
update amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1mN0xedZ6rF5H_bGCfI6MXIQjjLEjqHyH' where sku = 'AMB-FCRGL-RC1015TR -N2N-CON';
update amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=13vuGdqYn1Y6e9q2yKu3S_0yM4JiAe-nW' where sku = 'AMB-FCRGL-SM-45DEG -N2N Cbl 15MM';
update amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1FHppZixLXXJO8QOhVeqIyEuVEBUxw5V0' where sku = 'AMB-FCRGL-SM1610 -N2N-CON';
update amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1wIh2hK1gWYe1ZrLYAxmZPFEtEs61lCEw' where sku = 'AMB-FCRGL-SM1610-N2N Cbl 15MM';
update amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1GmmE6yZ1q3KgyOTox2gsxJ9WvkUcG3qa' where sku = 'AMB-FRNT-SWITCH';
update amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1HcrnCPE_xYM2M_vN4TH4Clop8XXJqXe3' where sku = 'AMB-Y-EXT';
