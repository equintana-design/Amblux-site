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
    .select("slug, category, eyebrow, name, hero_summary, hero_image_url, default_sku")
    .eq("status", "active")
    .order("sort_order");

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">Test the product finder</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">Find a component for your project.</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Explore approved AMBLUX linear systems, puck lights, drivers, controls, and accessories from the master product
          database.
        </p>

        <ProductFinder pages={pages ?? []} />
      </main>
    </div>
  );
}
