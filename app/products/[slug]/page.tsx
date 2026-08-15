import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/app/components/SiteHeader";
import { AccessoriesSection } from "./AccessoriesSection";
import { AccessoryCatalogIntro } from "./AccessoryCatalogIntro";
import { AccessoryGrid } from "./AccessoryGrid";
import { BenefitGrid } from "./BenefitGrid";
import { Breadcrumb } from "./Breadcrumb";
import { PrintMasthead } from "./PrintMasthead";
import { ProductHero } from "./ProductHero";
import { ProductStory } from "./ProductStory";
import { RecommendedApplications } from "./RecommendedApplications";
import { Specifications } from "./Specifications";
import { VariantProvider } from "./VariantState";

async function getPageData(slug: string) {
  const supabase = await createClient();

  const { data: page } = await supabase.from("amblux_product_pages").select("*").eq("slug", slug).single();
  if (!page) return null;

  const { data: variants } = await supabase.from("amblux_products").select("*").eq("page_slug", slug).order("sku");
  if (!variants || variants.length === 0) return null;

  return { page, variants };
}

async function getAllPageSlugs() {
  const supabase = await createClient();
  const { data } = await supabase.from("amblux_product_pages").select("slug");
  return new Set((data ?? []).map((r) => r.slug));
}

// Lets "Required accessories" text (e.g. "AMB-FCRGL-RC1015TR-PC-1.5M —
// power cord") link its SKU to that item's own page — the /products/
// accessories catalog page, now that power cords/brackets/clips/faceplates
// have one. Small enough (< 50 rows) to just pull the whole map per request
// rather than filtering per-page.
async function getSkuToSlug() {
  const supabase = await createClient();
  const { data } = await supabase.from("amblux_products").select("sku, page_slug").not("page_slug", "is", null);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.page_slug) map[row.sku] = row.page_slug;
  }
  return map;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPageData(slug);
  if (!data) return { title: "Product not found — AMBLUX" };

  return {
    title: `${data.page.name} — AMBLUX`,
    description: data.page.hero_summary ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPageData(slug);
  if (!data) notFound();

  const { page, variants } = data;

  // The "accessories" page (power cords, brackets, clips, faceplates) is a
  // grouped catalog listing, not a single product with a variant picker —
  // it doesn't fit the hero+configurator template the other 13 pages use.
  if (page.category === "accessory") {
    const pageSlugs = await getAllPageSlugs();
    return (
      <div className="flex flex-1 flex-col">
        <SiteHeader />
        <main>
          <Breadcrumb />
          <div className="mx-auto w-full max-w-6xl px-6 pt-6">
            <PrintMasthead />
          </div>
          <AccessoryCatalogIntro page={page} />
          <AccessoryGrid items={variants} pageSlugs={pageSlugs} />
        </main>
      </div>
    );
  }

  const axes = (page.variant_axes ?? []) as { key: string; label: string }[];
  const defaultSku = page.default_sku && variants.some((v) => v.sku === page.default_sku) ? page.default_sku : variants[0].sku;
  const skuToSlug = await getSkuToSlug();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main>
        <Breadcrumb />
        <div className="mx-auto w-full max-w-6xl px-6 pt-6">
          <PrintMasthead />
        </div>
        <VariantProvider variants={variants} axes={axes} defaultSku={defaultSku}>
          <ProductHero page={page} />
          <ProductStory page={page} />
          <RecommendedApplications page={page} />
          <BenefitGrid page={page} />
          <Specifications />
          <AccessoriesSection page={page} skuToSlug={skuToSlug} />
        </VariantProvider>
      </main>
    </div>
  );
}
