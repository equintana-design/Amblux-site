import Image from "next/image";
import Link from "next/link";
import type { Tables } from "@/lib/supabase/database.types";

type Product = Tables<"amblux_products">;

const GROUP_LABELS: Record<string, string> = {
  power_cord: "Power cords",
  install_accessory: "Installation brackets & clips",
  faceplate: "Puck faceplates",
  extension_cord: "Extension cables",
};

const GROUP_ORDER = ["power_cord", "install_accessory", "faceplate", "extension_cord"];

// Most accessory rows carry the linear family they belong to in family_id,
// which — conveniently — is the same string as that family's product page
// slug (e.g. family_id "rigid-10x15" ⇄ /products/rigid-10x15). Faceplates
// don't have a family_id (they're not part of the linear-family schema) but
// only ever belong to the recessed puck today.
function parentSlug(product: Product): string | null {
  if (product.family_id) return product.family_id;
  if (product.category === "faceplate") return "recessed-puck";
  return null;
}

export function AccessoryGrid({ items, pageSlugs }: { items: Product[]; pageSlugs: Set<string> }) {
  const grouped = new Map<string, Product[]>();
  for (const item of items) {
    const key = GROUP_LABELS[item.category] ? item.category : "other";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  const orderedKeys = [...GROUP_ORDER.filter((k) => grouped.has(k)), ...(grouped.has("other") ? ["other"] : [])];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-20">
      {orderedKeys.map((key) => (
        <section key={key} className="mt-14">
          <h2 className="text-xl font-semibold text-foreground">{GROUP_LABELS[key] ?? "Other accessories"}</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {grouped.get(key)!.map((item) => {
              const parent = parentSlug(item);
              const parentHref = parent && pageSlugs.has(parent) ? `/products/${parent}` : null;
              return (
                <article key={item.sku} id={item.sku} className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="relative h-40 w-full bg-background">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.label}
                        fill
                        className="object-contain p-4"
                        sizes="(min-width: 1024px) 33vw, 100vw"
                      />
                    ) : null}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-foreground">{item.label}</h3>
                    {item.short_description ? <p className="mt-2 text-sm text-muted">{item.short_description}</p> : null}
                    <code className="mt-3 block break-all text-xs text-muted">{item.sku}</code>
                    {parentHref ? (
                      <Link href={parentHref} className="mt-3 inline-block text-sm font-medium text-accent-strong hover:underline">
                        Used with this fixture →
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
