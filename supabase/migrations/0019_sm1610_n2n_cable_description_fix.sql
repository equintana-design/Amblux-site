-- AMB-FCRGL-SM1610-N2N Cbl 15MM was seeded (0018) with an "L shape
-- connector" description carried verbatim from the source spreadsheet,
-- despite its "N2N Cbl 15MM" name pattern matching
-- AMB-FCRGL-SM-45DEG -N2N Cbl 15MM, which is correctly described as a
-- cable. Confirmed by request: it's a cable, not a connector — the
-- spreadsheet's own description for this row was the error. Corrected here
-- to match its sibling SKU's cable description (same wording pattern, just
-- the family name swapped), and the label updated from "End-to-end
-- connector" to "End-to-end cable" to match.
update public.amblux_products
set label = 'End-to-end cable · 15 mm',
    short_description = '2 m 24AWG white cable with end cap at both sides — PC, transparent'
where sku = 'AMB-FCRGL-SM1610-N2N Cbl 15MM';
