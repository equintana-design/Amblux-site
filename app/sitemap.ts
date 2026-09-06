import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

// Canonical, public-facing domain — matches the domain Vercel is configured
// to serve Production traffic from (amblux.com 308-redirects to this one;
// see the Vercel Domains settings) and what Supabase Auth's Site URL now
// points at. Sitemap/canonical URLs always use this host regardless of
// which hostname a given request came in on.
const SITE_URL = "https://www.amblux.com";

// Drives /sitemap.xml (Next's App Router convention: this file's default
// export becomes that route automatically, no separate XML template
// needed). Built 2026-09-05 as part of migrating amblux.com off Shopify —
// the previous site never had one, so Google had no single list of every
// page to (re)crawl after the platform switch. Lists every page a visitor
// can actually reach and that's worth Google indexing: the static
// marketing/account-entry pages, plus every *active* product page pulled
// live from the same `amblux_product_pages` table the public /products
// catalog itself reads from — so a newly published product shows up here
// automatically on its next deploy, and a de-listed one (status flipped
// off "active") drops out just as automatically, with no manual sitemap
// maintenance ever required.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: pages } = await supabase
    .from("amblux_product_pages")
    .select("slug")
    .eq("status", "active");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/start`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
  ];

  const productRoutes: MetadataRoute.Sitemap = (pages ?? []).map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
