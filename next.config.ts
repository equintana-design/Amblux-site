import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product photos (see migration 0010) live in AMBLUX's Google Drive
    // library rather than Supabase Storage — no network path from the
    // build/admin environment to Storage's upload API at the time this was
    // written, so they're linked directly via Drive's direct-view URL
    // pattern instead. Allow-listing the host here is what lets
    // next/image optimize/serve them like any other remote image.
    remotePatterns: [{ protocol: "https", hostname: "drive.google.com" }],
  },
};

export default nextConfig;
