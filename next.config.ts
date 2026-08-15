import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
