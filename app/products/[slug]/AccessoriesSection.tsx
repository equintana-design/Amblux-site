import Link from "next/link";
import type { Tables } from "@/lib/supabase/database.types";

type RequiredAccessory = {
  title: string;
  body?: string;
  items?: string[];
  links?: { label: string; slug: string }[];
};

// Required-accessory "items" are authored as "SKU — description" strings
// (e.g. "AMB-FCRGL-RC1015TR-PC-1.5M — power cord"). If that leading SKU has
// its own page (the /products/accessories catalog, or occasionally a full
// family page), link it; otherwise leave the text exactly as authored.
function AccessoryItem({ item, skuToSlug }: { item: string; skuToSlug: Record<string, string> }) {
  const separator = " — ";
  const splitAt = item.indexOf(separator);
  if (splitAt === -1) return <>{item}</>;

  const code = item.slice(0, splitAt);
  const rest = item.slice(splitAt);
  const slug = skuToSlug[code];
  if (!slug) return <>{item}</>;

  return (
    <>
      <Link href={`/products/${slug}#${encodeURIComponent(code)}`} className="font-medium text-accent-strong hover:underline">
        {code}
      </Link>
      {rest}
    </>
  );
}

export function AccessoriesSection({
  page,
  skuToSlug,
}: {
  page: Tables<"amblux_product_pages">;
  skuToSlug: Record<string, string>;
}) {
  const required = (page.required_accessories ?? []) as RequiredAccessory[];
  const optional = (page.optional_accessory_codes ?? []) as string[];
  if (required.length === 0 && optional.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-16 px-6 py-20 lg:grid-cols-2 print:grid-cols-2 print:gap-10 print:py-10">
        {required.length > 0 ? (
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">Required accessories</p>
            <p className="mt-2 text-sm text-muted">A complete installation requires the item(s) below.</p>
            <div className="mt-6 space-y-4">
              {required.map((accessory, i) => (
                <article key={i} className="rounded-2xl border border-border p-5">
                  <h3 className="text-base font-semibold text-foreground">{accessory.title}</h3>
                  {accessory.body ? <p className="mt-2 text-sm leading-6 text-muted">{accessory.body}</p> : null}
                  {accessory.items ? (
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted">
                      {accessory.items.map((item) => (
                        <li key={item}>
                          <AccessoryItem item={item} skuToSlug={skuToSlug} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {accessory.links && accessory.links.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {accessory.links.map((link) => (
                        <Link
                          key={link.slug}
                          href={`/products/${link.slug}`}
                          className="rounded-full border border-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong hover:bg-accent-soft/20"
                        >
                          {link.label} →
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div />
        )}

        {optional.length > 0 ? (
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">Optional accessories</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {optional.map((code) => {
                const slug = skuToSlug[code];
                return slug ? (
                  <Link
                    key={code}
                    href={`/products/${slug}#${encodeURIComponent(code)}`}
                    className="rounded-lg border border-accent-soft bg-background px-3 py-1.5 text-xs font-medium text-accent-strong hover:bg-accent-soft/20"
                  >
                    {code}
                  </Link>
                ) : (
                  <code key={code} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted">
                    {code}
                  </code>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
