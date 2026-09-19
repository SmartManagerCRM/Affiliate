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
