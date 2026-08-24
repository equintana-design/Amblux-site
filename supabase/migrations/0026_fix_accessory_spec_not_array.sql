-- 23 accessory SKUs from migration 0022 got `spec` stored as a JSON
-- object ({} or {"finish": "..."}) instead of an array. The product
-- page's Specifications component expects spec to always be an array of
-- {label, value} rows and calls .map() on it directly — a plain object
-- silently passes its "is it empty" guard (object.length is undefined,
-- not 0) and then crashes with "spec.map is not a function", producing a
-- 500 error on every one of these accessory pages ("View product
-- details" links).
--
-- The 3 faceplate SKUs carried real data ({"finish": "black"/"satinNickel"
-- /"white"}) — convert those into a proper one-row spec array instead of
-- discarding the data. Everything else just becomes an empty array.
update public.amblux_products
set spec = jsonb_build_array(
  jsonb_build_object(
    'label', 'Finish',
    'value', case spec->>'finish'
      when 'black' then 'Black'
      when 'satinNickel' then 'Satin Nickel'
      when 'white' then 'White'
      else initcap(spec->>'finish')
    end
  )
)
where jsonb_typeof(spec) = 'object' and spec ? 'finish';

update public.amblux_products
set spec = '[]'::jsonb
where jsonb_typeof(spec) <> 'array';
