export function placeholderImage(
  slug: string,
  opts: { title: string; subtitle?: string; w?: number; h?: number; variant?: string }
) {
  const params = new URLSearchParams();
  params.set("title", opts.title);
  if (opts.subtitle) params.set("subtitle", opts.subtitle);
  if (opts.w) params.set("w", String(opts.w));
  if (opts.h) params.set("h", String(opts.h));
  if (opts.variant) params.set("v", opts.variant);
  return `/placeholder/${encodeURIComponent(slug)}?${params.toString()}`;
}

const SUPABASE_STORAGE_HOSTNAME = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/**
 * next.config.ts's next/image remotePatterns only allow-lists our own
 * Supabase storage host (plus local paths) — anything else throws at
 * request time. Manually-uploaded product images always go through
 * actions/images.ts's uploadProductImage(), which re-hosts them into that
 * bucket, so they're always safe. But product_import_sources-sourced
 * images (main_image / product_images.url set directly from an affiliate
 * network's feed) are raw external URLs on whatever host that network's
 * feed happens to use — not on the allow-list. Any component rendering a
 * product image must check this and render those unoptimized instead of
 * assuming every image src is on an allow-listed host. `allowedHostname`
 * is injectable so this stays testable without depending on ambient env
 * vars at test time.
 */
export function isOptimizableImageSrc(src: string, allowedHostname: string | undefined = SUPABASE_STORAGE_HOSTNAME): boolean {
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    return url.hostname === allowedHostname;
  } catch {
    return false;
  }
}
