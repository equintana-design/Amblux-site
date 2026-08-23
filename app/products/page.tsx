import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/app/components/SiteHeader";
import { ProductFinder } from "./ProductFinder";

export const metadata: Metadata = {
  title: "Products — AMBLUX",
  description: "Browse AMBLUX's full line of kitchen, furniture, and closet lighting: linear solutions, puck lights, drivers, and controls.",
};

export default async function ProductsIndexPage() {
  const supabase = await createClient();
  const [{ data: pages }, { data: products }] = await Promise.all([
    supabase
      .from("amblux_product_pages")
      .select("slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, translations")
      .eq("status", "active")
      .order("sort_order"),
    // Every SKU on a page, not just its default one — a page with several
    // variants (different lengths, wattages, colours) should be findable
    // by searching ANY of its SKUs, not only the one that happens to be
    // the default selection.
    supabase.from("amblux_products").select("sku, page_slug"),
  ]);

  const skusByPage = new Map<string, string[]>();
  for (const p of products ?? []) {
    if (!p.page_slug) continue;
    const list = skusByPage.get(p.page_slug) ?? [];
    list.push(p.sku);
    skusByPage.set(p.page_slug, list);
  }
  const pagesWithSkus = (pages ?? []).map((page) => ({ ...page, skus: skusByPage.get(page.slug) ?? [] }));

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-16">
        <ProductFinder pages={pagesWithSkus} />
      </main>
    </div>
  );
}
