import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    qualities: [60, 75, 90],
    // Next.js 16 blocks any local next/image source that isn't explicitly
    // allow-listed here once localPatterns is set at all — so every local
    // path the app actually renders through <Image> needs an entry, not
    // just the one that motivated adding this config.
    localPatterns: [
      // /placeholder/[slug] takes title/subtitle/w/h (and a variant seed)
      // that differ per product, so `search` is intentionally omitted to
      // allow any query string on this one path — the route only ever
      // reads those specific params itself, it doesn't proxy or fetch
      // arbitrary URLs.
      {
        pathname: "/placeholder/**",
      },
      // Static files under public/ (logo, etc.) are never requested with a
      // query string, so those are locked down to exact no-search matches.
      {
        pathname: "/**",
        search: "",
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

export default withNextIntl(nextConfig);
