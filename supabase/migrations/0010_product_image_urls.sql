-- Primary product photo per SKU, sourced from AMBLUX's own Google Drive
-- product-images library (one folder per SKU, now shared link-viewable).
-- Linked directly via Drive's direct-view URL pattern rather than mirrored
-- into Supabase Storage (see migration 0009's sibling column comment for
-- why: no network path from the build/admin environment to Storage's
-- upload API at the time this was written).
--
-- Three SKUs intentionally have no image_url set here, flagged for a human
-- to fix directly in Drive:
--   - AMB-FCRGL-SM-45DEG-PC-1.5M: that SKU's Drive folder is empty.
--   - AMB-FCRGL-SM-45DEG -BRKT: that SKU's Drive folder contains a photo
--     titled "AMB-FCST-SR1010-45DEG -CLIPS.png" — looks like the wrong file
--     was uploaded into this folder (the real CLIPS SKU already has its own
--     correctly-photographed folder elsewhere), so left unset rather than
--     showing a possibly-wrong product photo.
--   - AMB-APP: software feature, no physical product, no photo expected.

update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=17PowxSug1eSnLG6NHzIGASlRR11p-dgl' where sku = 'AMB-PK-RC58-24V-345-90-35W-LE';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1V7JpP3gJUIkQt_TzczQuKNJYqJMNijcU' where sku = 'AMB-PK-RC58-FACEPLATE-WH';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1a0HqZDB_dIUzdz2QpmPTxzoqxiVATOTL' where sku = 'AMB-PK-RC58-FACEPLATE-SN';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1PJTh19aojoDzDa9Az_i5cfHOWMCWDlv3' where sku = 'AMB-PK-RC58-FACEPLATE-BK';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1_u8OGBoBK_-FYggQZaje7vHgqG28dTg9' where sku = 'AMB-PK-SLSR35-24V-345-90-2W-CH';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1aQZv9jO3supBhyRwEAh-PEpKCS4fOv5R' where sku = 'AMB-PK-SLSR35-24V-345-90-2W-WH';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1PKvMVSXmHCMIdgWfYnt8M_TrYdCBFagn' where sku = 'AMB-EXT-2M';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1IUdVgoh2K-INX8AJaf14bJoZXrCmYYs1' where sku = 'AMB-FCRGL-RC0608TR-24V-30-24-90-2.4M-18W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1cT4QB5I-S8uLDyxBjkB0dScjHaGieL2J' where sku = 'AMB-FCRGL-RC0608TR-24V-40-24-90-2.4M-18W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1gZ7OaOdF1Wruc5k1N6sR7KS1R-AY5kur' where sku = 'AMB-FCRGL-RC0608TR-PC-1.5M';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1w0WY1br9M-6x3qC3WD8h5Fg_vpiXTjV2' where sku = 'AMB-FCRGL-SM1610 -BRKT';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1VbIv4UJF80ROLGCIQBra2zs-pJRQDx8S' where sku = 'AMB-FCRGL-RC1015TR -BRKT';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1BULhW-NOaP4EX2PL8WjzeOWdj-NN4zHM' where sku = 'AMB-FCRGL-RC1015TR-PC-1.5M';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1cyCvFDwXvkpQTmAHxrfwtDzScxBl5DOg' where sku = 'AMB-FCRGL-RC1015TR-24V-30-24-90-2.4M-28.8W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1UBLWgRMnmMmcoIpsh0AazoI-xsxuLvjL' where sku = 'AMB-FCRGL-SM-45DEG -24V-30-24-90-2.4M-28.8W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=195uZlcG66ZQm6ZZA9f1owLGiuSTxu4ul' where sku = 'AMB-FCRGL-SM1610 -24V-40-24-90-2.4M-28.8W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1PqhEXeCHadJMbRwkcFKnYxTgxaEhmtQ2' where sku = 'AMB-FCRGL-SM1610-24V-30-24-90-2.4M-28.8W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1KrkAppTFpTXHwbv8zEf_GS2HW-mME9SX' where sku = 'AMB-FCRGL-SM1610-PC-1.5M';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1vJTgqokoUSXRhd0NZHfDFniXjbNQeqkM' where sku = 'AMB-FCST-RC0485TR-24V-30-24-90-3M-18W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1ORjR7lR_s-qss_H_mmL-ltjq4P0frPaM' where sku = 'AMB-FCST-RC0485TR-24V-40-24-90-3M-18W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1LmUGfLwN9efF7uCbmLrJNzK7A14SAWre' where sku = 'AMB-FCST-SR1010-45DEG -CLIPS';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1_wHUVabFJv4px6AXrSCUY1YTXSoR0Ajp' where sku = 'AMB-FCST-RC0606-24V-40-24-90-3M-27W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=15g-3ZrPXedUyVzn1xhi9ubalEeK49VGa' where sku = 'AMB-FCST-RC0606-24V-40-24-90-1.5M-13.5W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1RMUPE1S15xH8eWhGcurio4NzWQ-1g7ao' where sku = 'AMB-FCST-RC0606-24V-30-24-90-1.5M-13.5W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1ZaNQBPRMVe4IKTS6xPSZLEylQFlZ2Ype' where sku = 'AMB-FCST-RC0606-24V-30-24-90-3M-27W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1awF56DixBMBi-qw94myBdms_cpG7pbLM' where sku = 'AMB-FCST-SR1010-45DEG -24V-40-24-90-3M-27W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=14IsnUlkaX5Sy1kjWh2Y6uSQ1zE2-DdS7' where sku = 'AMB-FCST-SR1010-45DEG -24V-30-24-90-3M-27W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1dclZ76iHqqLslbR3xvLTWZRtCtoM0fPI' where sku = 'AMB-FCST-SR1010-45DEG -24V-30-24-90-5M-45W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=17OXvfemcBlJmCQmjHIrSQHKUWbXodqol' where sku = 'AMB-WR-SS-1DOOR';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1rKMVWBxYuEZj2f3cmMN2NJukLff2NPVv' where sku = 'AMB-WR-SS-2DOOR';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1JcCsYlPmim8fokTbd35Aomvr4cgBlIJs' where sku = 'AMB-WR-SS-MS';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1uvFjO3pHLGQOPpAQBkVUMSGj8H_xL3Yv' where sku = 'AMB-WR-SS-MS-DN';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1-nSB8YrAhRbNkbpmhhrmo4vPa1JNcFTJ' where sku = 'AMB-WR-SS-TOUCH-DMR';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=15c2qaui5nAwaWxew92HsJN0YMiyd-EjI' where sku = 'AMB-WRLSS-MS';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1csJy9fLpXgDYqmkSkI0eYKkl1vZRduk9' where sku = 'AMB-WRLSS-SS-MDOOR';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1u4WciLhf9EnXtrpLs8zpKcYorxdFRUiJ' where sku = 'AMB-WRLSS-SS-RCVR';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1dVraj5rfpWnw5iUm-NUbmFn-FmLvwji1' where sku = 'AMB-WRLSS-SS-TOUCH-DMR';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1PggLjLk_XL7WS-63d56zKZ3_NcXRfhpi' where sku = 'AMB-FCRGL-RC1015TR -24V-40-24-90-2.4M-28.8W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1014RMJJ5tIEA9yftwCn-v-wZGo5n471p' where sku = 'AMB-DRV-24V-96W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1HASAdkIVaX1dwI77hpgMnSPm826jf5nL' where sku = 'AMB-DRV-24V-60W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1cdI_ytSih8ACiscsrx8PJ1b0Ng_y8pXg' where sku = 'AMB-DRV-24V-36W';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1gEuD-7PMy31F-lPdHrJiusLwmkXJZmRP' where sku = 'AMB-DMG-WRLSS-KNT-2ZWS';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1pS4eCr0pFr78UcJkssZJ01mziZHLtu2B' where sku = 'AMB-DMG-WRLSS-KNT-BTN';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1i3I2gRevcFKy7GqnLw9JtC_ui7vSzNr3' where sku = 'AMB-DMG-WRLSS-KNT-1ZWS';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1Nra3ZyiwqGILea5KooySGbFKBr8f278l' where sku = 'AMB-DMG-WRLSS-RCVR';
update public.amblux_products set image_url = 'https://drive.google.com/uc?export=view&id=1QYkyXaB3Rq-Kez0VjsX3HWlSl_cmZ-2j' where sku = 'AMB-DRV-24V-24W';
