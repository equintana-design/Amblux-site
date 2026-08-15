import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/app/components/SiteHeader";
import { AccessoriesSection } from "./AccessoriesSection";
import { BenefitGrid } from "./BenefitGrid";
import { Breadcrumb } from "./Breadcrumb";
import { PrintMasthead } from "./PrintMasthead";
import { ProductHero } from "./ProductHero";
import { ProductStory } from "./ProductStory";
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

// Lets "Required accessories" text (e.g. "AMB-FCRGL-RC1015TR-PC-1.5M —
// power cord") link its SKU to that item's own page. Every accessory/
// replacement-part SKU now has its own dedicated product_pages row (see
// migration 0022 — previously they were all grouped under one shared
// /products/accessories catalog page), so this is a plain sku -> its own
// slug lookup, same as for the 13 family pages. Small enough (< 60 rows)
// to just pull the whole map per request rather than filtering per-page.
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

  // Every product page — the 13 families and, as of migration 0022, every
  // individual accessory/replacement part too — now uses the same
  // hero+configurator template. Accessory pages simply have no
  // variant_axes (single SKU, no picker) and mostly-empty marketing
  // fields, so the axes selector and ProductStory/BenefitGrid sections
  // just don't render for them (see each component's own empty guard).
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
          <BenefitGrid page={page} />
          <Specifications />
          <AccessoriesSection page={page} skuToSlug={skuToSlug} />
        </VariantProvider>
      </main>
    </div>
  );
}
