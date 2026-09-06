import type { MetadataRoute } from "next";

const SITE_URL = "https://www.amblux.com";

// Drives /robots.txt. Keeps signed-in-only and admin-only areas out of
// Google's index — not a security boundary (RLS + the page-level
// requireAdmin()/auth checks are what actually protect them; see
// app/admin/pricing/actions.ts's own header comment for that pattern) but
// there's no SEO value in a login-gated admin panel or a visitor's own
// account page showing up in search results. Everything public-facing
// (the homepage, /products and every product page, /start, /contact,
// /sign-in, /sign-up) stays crawlable. Points at the sitemap above so
// Google discovers every page from one place rather than only by
// following links.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/configurator", "/project"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
