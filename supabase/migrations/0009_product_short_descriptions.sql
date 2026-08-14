-- Real short descriptions from AMBLUX's own product database spreadsheet
-- (the "AMBLUX Product Database" Google Sheet, sales-sheet source of truth),
-- copied verbatim per SKU including the source's own inconsistent spacing/
-- capitalization. amblux_products.short_description was NULL for every row
-- before this migration.
--
-- Note for a human to double check later: the sheet's short-description text
-- for the SR1010 surface-mount silicone family (and its CLIPS accessory)
-- says "Recess Silicone" even though that family's own Mount Type column
-- (and AMBLUX's confirmed real spacing/mounting facts already encoded in
-- catalog.ts) say Surface mount — looks like a copy-paste artifact in the
-- source sheet itself, carried over as-is rather than silently corrected.
-- Doesn't affect any app logic (mounting is driven by catalog.ts, not this
-- text), just worth a look next time that sheet is edited.

update public.amblux_products set short_description = '24V Puck Light Pro puck, 58mm, 3-4-5K, CRI90, 24V, recessed light engine' where sku = 'AMB-PK-RC58-24V-345-90-35W-LE';
update public.amblux_products set short_description = '24V Faceplate for Puck Light Pro puck recessed white' where sku = 'AMB-PK-RC58-FACEPLATE-WH';
update public.amblux_products set short_description = '24V Faceplate for Puck Light Pro puck recessed Satin Nickel' where sku = 'AMB-PK-RC58-FACEPLATE-SN';
update public.amblux_products set short_description = '24V Faceplate for Puck Light Pro puck recessed Black' where sku = 'AMB-PK-RC58-FACEPLATE-BK';
update public.amblux_products set short_description = '24V Puck Light Pro puck, 58mm, 3-4-5K, CRI90, 24V, SLIM SURFACE WHITE' where sku = 'AMB-PK-SLSR35-24V-345-90-2W-WH';
update public.amblux_products set short_description = '24V Puck Light Pro puck, 58mm, 3-4-5K, CRI90, 24V, SLIM SURFACE CHROME' where sku = 'AMB-PK-SLSR35-24V-345-90-2W-CH';

update public.amblux_products set short_description = 'Flexible Freecut Recess Silicone LED Tape (6mm by 6mm), 24v, 90 CRI, 3000K -9W/M-1.5m' where sku = 'AMB-FCST-RC0606-24V-30-24-90-1.5M-13.5W';
update public.amblux_products set short_description = 'Flexible Freecut Recess Silicone LED Tape (6mm by 6mm), 24v, 90 CRI, 4000K -9W/M-1.5m' where sku = 'AMB-FCST-RC0606-24V-40-24-90-1.5M-13.5W';
update public.amblux_products set short_description = 'Flexible Freecut Recess Silicone LED Tape (6mm by 6mm), 24v, 90 CRI, 3000K -9W/M-3m' where sku = 'AMB-FCST-RC0606-24V-30-24-90-3M-27W';
update public.amblux_products set short_description = 'Flexible Freecut Recess Silicone LED Tape (6mm by 6mm), 24v, 90 CRI, 4000K -9W/M-3m' where sku = 'AMB-FCST-RC0606-24V-40-24-90-3M-27W';
update public.amblux_products set short_description = 'Flexible Freecut Recess Silicone LED Tape (10mm by 10mm 45 deg), 24v, 90 CRI, 3000K -9W/M-3m' where sku = 'AMB-FCST-SR1010-45DEG -24V-30-24-90-3M-27W';
update public.amblux_products set short_description = 'Flexible Freecut Recess Silicone LED Tape (10mm by 10mm 45 deg), 24v, 90 CRI, 4000K -9W/M-3m' where sku = 'AMB-FCST-SR1010-45DEG -24V-40-24-90-3M-27W';
update public.amblux_products set short_description = 'Flexible Freecut Recess Silicone LED Tape (10mm by 10mm 45 deg), 24v, 90 CRI, 3000K -9W/M-5m' where sku = 'AMB-FCST-SR1010-45DEG -24V-30-24-90-5M-45W';
update public.amblux_products set short_description = 'Recess Silicone LED Tape (10mm by 10mm 45 deg), Clips bag of 10' where sku = 'AMB-FCST-SR1010-45DEG -CLIPS';
update public.amblux_products set short_description = 'Flexible Freecut Recess Silicone LED Tape (4mm by 8.5mm translucent trim), 24v, 90 CRI, 3000K -6W/M-3M' where sku = 'AMB-FCST-RC0485TR-24V-30-24-90-3M-18W';
update public.amblux_products set short_description = 'Flexible Freecut Recess Silicone LED Tape (4mm by 8.5mm translucent trim), 24v, 90 CRI, 4000K -6W/M-3M' where sku = 'AMB-FCST-RC0485TR-24V-40-24-90-3M-18W';

update public.amblux_products set short_description = 'Freecut Rigid Recess Solder free Linear Solution 10mmX15mm, 24v, 90 CRI, 3000K -12W/M-2.4m Titanium Grey' where sku = 'AMB-FCRGL-RC1015TR-24V-30-24-90-2.4M-28.8W';
update public.amblux_products set short_description = 'Freecut Rigid Recess Solder free Linear Solution 10mmX15mm, 24v, 90 CRI, 4000K -12W/M-2.4m Titanium Grey' where sku = 'AMB-FCRGL-RC1015TR -24V-40-24-90-2.4M-28.8W';
update public.amblux_products set short_description = 'Freecut Rigid Recess Solder free Linear Solution, 24v, power cable 1.5M' where sku = 'AMB-FCRGL-RC1015TR-PC-1.5M';
update public.amblux_products set short_description = 'Freecut Rigid Recess stainless steel installation bracket 10pcs (with screws)' where sku = 'AMB-FCRGL-RC1015TR -BRKT';
update public.amblux_products set short_description = 'Freecut Rigid 45 Deg Surface mount Solder free LED linear Solution, 24v, 90 CRI, 3000K -12W/M-2.4m Titanium Grey' where sku = 'AMB-FCRGL-SM-45DEG -24V-30-24-90-2.4M-28.8W';
update public.amblux_products set short_description = 'Freecut Rigid, 24v, power cable 1.5M' where sku = 'AMB-FCRGL-SM-45DEG-PC-1.5M';
update public.amblux_products set short_description = 'Freecut Rigid 45 Deg Surface mount stainless steel installation bracket 10pcs (with screws)' where sku = 'AMB-FCRGL-SM-45DEG -BRKT';
update public.amblux_products set short_description = 'Freecut Rigid surface mount Solder free Linear Solution 10X15mm, 24v, 90 CRI, 3000K -12W/M-2.4m Titanium Grey' where sku = 'AMB-FCRGL-SM1610-24V-30-24-90-2.4M-28.8W';
update public.amblux_products set short_description = 'Freecut Rigid surface mount Solder free Linear Solution 10mmX15mm, 24v, 90 CRI, 4000K -12W/M-2.4m Titanium Grey' where sku = 'AMB-FCRGL-SM1610 -24V-40-24-90-2.4M-28.8W';
update public.amblux_products set short_description = 'Freecut Rigid surface mount Solder free Linear Solution, 24v, power cable 1.5M' where sku = 'AMB-FCRGL-SM1610-PC-1.5M';
update public.amblux_products set short_description = 'Freecut Surface mount stainless steel installation bracket 10pcs (with screws)' where sku = 'AMB-FCRGL-SM1610 -BRKT';
update public.amblux_products set short_description = 'Freecut Rigid Recess Solder-free Linear Solution 6mm by 8mm, 24v, 90 CRI, 3000K -7.5W/M-2.4m Titanium Grey' where sku = 'AMB-FCRGL-RC0608TR-24V-30-24-90-2.4M-18W';
update public.amblux_products set short_description = 'Freecut Rigid Recess Solder free Linear Solution 6mm by 8mm, 24v, 90 CRI, 4000K -7.5W/M-2.4m Titanium Grey' where sku = 'AMB-FCRGL-RC0608TR-24V-40-24-90-2.4M-18W';
update public.amblux_products set short_description = 'Freecut Rigid Recess Solder-free Linear Solution, 24v, power cable 1.5M' where sku = 'AMB-FCRGL-RC0608TR-PC-1.5M';

update public.amblux_products set short_description = 'Centralized control power supply 24W with 1.5M plug in power cord' where sku = 'AMB-DRV-24V-24W';
update public.amblux_products set short_description = 'Centralized control power supply 36W with 1.5M plug in power cord' where sku = 'AMB-DRV-24V-36W';
update public.amblux_products set short_description = 'Centralized control power supply 60W with 1.5M plug in power cord' where sku = 'AMB-DRV-24V-60W';
update public.amblux_products set short_description = 'Centralized control power supply 96W with 1.5M plug in power cord' where sku = 'AMB-DRV-24V-96W';

update public.amblux_products set short_description = 'LED wired sensor touch switch & dimmer' where sku = 'AMB-WR-SS-TOUCH-DMR';
update public.amblux_products set short_description = 'LED wired sensor Door Control Switch' where sku = 'AMB-WR-SS-1DOOR';
update public.amblux_products set short_description = 'LED wired sensor Door Control Sensor Switch (double detector)' where sku = 'AMB-WR-SS-2DOOR';
update public.amblux_products set short_description = 'LED wired sensor PIR Sensor Switch' where sku = 'AMB-WR-SS-MS';
update public.amblux_products set short_description = 'LED wired sensor PIR Sensor Switch, and Day and Night sensor' where sku = 'AMB-WR-SS-MS-DN';
update public.amblux_products set short_description = 'LED Wireless receiver' where sku = 'AMB-WRLSS-SS-RCVR';
update public.amblux_products set short_description = 'LED Wireless sensor touch switch & dimmer' where sku = 'AMB-WRLSS-SS-TOUCH-DMR';
update public.amblux_products set short_description = 'LED Wireless Sensor Door Control Switch for single or double doors' where sku = 'AMB-WRLSS-SS-MDOOR';
update public.amblux_products set short_description = 'LED Wireless sensor PIR Sensor Switch' where sku = 'AMB-WRLSS-MS';
update public.amblux_products set short_description = 'Wireless RF and Bluetooth receiver for Kinetic RF Switches and App' where sku = 'AMB-DMG-WRLSS-RCVR';
update public.amblux_products set short_description = 'Kinetic RF Switches 1 Gang, 1 Zone' where sku = 'AMB-DMG-WRLSS-KNT-1ZWS';
update public.amblux_products set short_description = 'Kinetic RF Switches 1 Gang, 2 Zones' where sku = 'AMB-DMG-WRLSS-KNT-2ZWS';
update public.amblux_products set short_description = 'Kinetic RF button small Switch' where sku = 'AMB-DMG-WRLSS-KNT-BTN';
update public.amblux_products set short_description = 'Bluetooth App' where sku = 'AMB-APP';

update public.amblux_products set short_description = 'Extension Cable 2M, 5 per bag' where sku = 'AMB-EXT-2M';
