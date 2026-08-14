import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/app/components/SiteHeader";

export const metadata: Metadata = {
  title: "Products — AMBLUX",
  description: "Browse AMBLUX's full line of kitchen, furniture, and closet lighting: linear solutions, puck lights, drivers, and controls.",
};

const CATEGORY_ORDER = ["silicone-linear", "rigid-linear", "puck", "driver", "control", "accessory"] as const;
const CATEGORY_LABELS: Record<(typeof CATEGORY_ORDER)[number], string> = {
  "silicone-linear": "Silicone linear",
  "rigid-linear": "Rigid linear",
  puck: "Puck lights",
  driver: "Drivers",
  control: "Controls",
  accessory: "Accessories",
};

export default async function ProductsIndexPage() {
  const supabase = await createClient();
  const { data: pages } = await supabase
    .from("amblux_product_pages")
    .select("slug, category, eyebrow, name, hero_summary, hero_image_url")
    .eq("status", "active")
    .order("sort_order");

  const grouped = new Map<string, typeof pages>();
  for (const category of CATEGORY_ORDER) grouped.set(category, []);
  for (const page of pages ?? []) {
    if (!grouped.has(page.category)) grouped.set(page.category, []);
    grouped.get(page.category)!.push(page);
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">Product finder</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">Every AMBLUX product family</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Real part numbers, full technical specifications, and the accessories each family needs — grouped the same way our
          configurator sizes a job.
        </p>

        {CATEGORY_ORDER.map((category) => {
          const items = grouped.get(category);
          if (!items || items.length === 0) return null;
          return (
            <section key={category} className="mt-14">
              <h2 className="text-xl font-semibold text-foreground">{CATEGORY_LABELS[category]}</h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/products/${page.slug}`}
                    className="group overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-accent"
                  >
                    <div className="relative h-48 w-full bg-background">
                      {page.hero_image_url ? (
                        <Image
                          src={page.hero_image_url}
                          alt={page.name}
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 33vw, 100vw"
                        />
                      ) : null}
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-strong">{page.eyebrow}</p>
                      <h3 className="mt-2 font-semibold text-foreground group-hover:text-accent-strong">{page.name}</h3>
                      {page.hero_summary ? <p className="mt-2 text-sm text-muted line-clamp-2">{page.hero_summary}</p> : null}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
