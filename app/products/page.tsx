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
  const { data: pages } = await supabase
    .from("amblux_product_pages")
    .select("slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku, translations")
    .eq("status", "active")
    .order("sort_order");

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-16">
        <ProductFinder pages={pages ?? []} />
      </main>
    </div>
  );
}
