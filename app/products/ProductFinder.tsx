"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTestProject } from "@/app/providers/TestProjectProvider";
import { TestProjectSidebar } from "./TestProjectSidebar";

export const CATEGORY_ORDER = ["silicone-linear", "rigid-linear", "puck", "driver", "control", "accessory"] as const;
export const CATEGORY_LABELS: Record<(typeof CATEGORY_ORDER)[number], string> = {
  "silicone-linear": "Silicone linear",
  "rigid-linear": "Rigid linear",
  puck: "Puck lights",
  driver: "Drivers",
  control: "Controls",
  accessory: "Accessories",
};

type ProductPageRow = {
  slug: string;
  category: string;
  eyebrow: string;
  name: string;
  hero_summary: string | null;
  hero_image_url: string | null;
  default_sku: string | null;
};

// Search box + category filter pills + a live-filtering grid, matching the
// original site's "Find a component for your project" section
// (ambluxlandingpagespec.md section 6) — plus the sticky "Your test
// project" sidebar cart next to it.
export function ProductFinder({ pages }: { pages: ProductPageRow[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const { addItem } = useTestProject();
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const availableCategories = useMemo(
    () => CATEGORY_ORDER.filter((c) => pages.some((p) => p.category === c)),
    [pages],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pages.filter((page) => {
      const matchesCategory = category === "all" || page.category === category;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        page.name.toLowerCase().includes(q) ||
        page.eyebrow.toLowerCase().includes(q) ||
        (page.default_sku ?? "").toLowerCase().includes(q)
      );
    });
  }, [pages, query, category]);

  function handleAdd(page: ProductPageRow) {
    if (!page.default_sku) return;
    addItem({ sku: page.default_sku, label: page.name, pageSlug: page.slug, imageUrl: page.hero_image_url });
    setJustAdded(page.slug);
    window.setTimeout(() => setJustAdded((current) => (current === page.slug ? null : current)), 1800);
  }

  return (
    <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name or SKU"
            className="w-full rounded-full border border-border bg-surface px-5 py-3 text-sm text-foreground placeholder:text-muted sm:max-w-sm"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              category === "all"
                ? "border-foreground bg-foreground text-white"
                : "border-border bg-surface text-muted hover:border-accent hover:text-accent-strong"
            }`}
          >
            All products
          </button>
          {availableCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                category === c
                  ? "border-foreground bg-foreground text-white"
                  : "border-border bg-surface text-muted hover:border-accent hover:text-accent-strong"
              }`}
            >
              {CATEGORY_LABELS[c as (typeof CATEGORY_ORDER)[number]]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="mt-10 text-sm text-muted">No products match that search.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {filtered.map((page) => (
              <div key={page.slug} className="overflow-hidden rounded-2xl border border-border bg-surface">
                <Link href={`/products/${page.slug}`} className="group block">
                  <div className="relative h-48 w-full bg-background">
                    {page.hero_image_url ? (
                      <Image
                        src={page.hero_image_url}
                        alt={page.name}
                        fill
                        className="object-contain p-6"
                        sizes="(min-width: 1024px) 33vw, 100vw"
                      />
                    ) : null}
                  </div>
                  <div className="p-5 pb-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-strong">{page.eyebrow}</p>
                    <h3 className="mt-2 font-semibold text-foreground group-hover:text-accent-strong">{page.name}</h3>
                    {page.default_sku ? <code className="mt-1 block break-all text-xs text-muted">{page.default_sku}</code> : null}
                    {page.hero_summary ? <p className="mt-2 text-sm text-muted line-clamp-2">{page.hero_summary}</p> : null}
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-3 p-5 pt-4">
                  <Link href={`/products/${page.slug}`} className="text-sm font-semibold text-accent-strong hover:underline">
                    View product details →
                  </Link>
                  {page.default_sku ? (
                    <button
                      type="button"
                      onClick={() => handleAdd(page)}
                      className="shrink-0 rounded-full border border-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-strong hover:bg-accent-soft/20"
                    >
                      {justAdded === page.slug ? "Added ✓" : "Add to a project"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TestProjectSidebar />
    </div>
  );
}
