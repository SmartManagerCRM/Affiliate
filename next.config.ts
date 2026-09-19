import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    qualities: [60, 75, 90],
    // Next.js 16 requires local image sources with query strings to be
    // explicitly allow-listed. /placeholder/[slug] takes title/subtitle/w/h
    // (and a variant seed) that differ per product, so `search` is
    // intentionally omitted to allow any query string on this one path —
    // the route only ever reads those specific params itself, it doesn't
    // proxy or fetch arbitrary URLs.
    localPatterns: [
      {
        pathname: "/placeholder/**",
      },
    ],
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
