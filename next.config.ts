import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "Test Project" (the no-account, pick-SKUs-directly bill of materials)
  // was renamed to plain "Project" 2026-09 — anyone who bookmarked or
  // shared the old /test-project link still lands on the same page.
  async redirects() {
    return [{ source: "/test-project", destination: "/project", permanent: true }];
  },
  images: {
    // Most existing product photos (see migration 0010) live in AMBLUX's
    // Google Drive library rather than Supabase Storage, linked directly
    // via Drive's direct-view URL pattern. As of migration 0023, the new
    // admin product-page editor (/admin/products) can also upload images
    // straight to a Supabase Storage bucket ("product-images") — those get
    // served from the project's own Storage public-URL host, which needs
    // the same allow-listing treatment for next/image to render them.
    remotePatterns: [
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "vymtfqgvxhjbhkrgvgol.supabase.co" },
    ],
  },
  experimental: {
    serverActions: {
      // Next's default Server Action body limit is 1MB — fine for text
      // fields, but a real product photo (especially straight off a
      // phone camera) routinely exceeds that. Next rejects an over-limit
      // request before it ever reaches our own action code, so it can't
      // be caught/reported by app code (see resolveImageUrl's
      // uploadError handling in app/admin/products/actions.ts) — it just
      // surfaces as a generic Vercel "A server error occurred" page.
      // Raised to cover realistic product photos with headroom.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
