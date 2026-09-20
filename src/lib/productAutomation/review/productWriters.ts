import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";

type SupabaseAdmin = Awaited<ReturnType<typeof createClient>>;

/** Find-or-create-by-slug — mirrors actions/products.ts's own resolveBrandId exactly. */
export async function resolveBrandId(supabase: SupabaseAdmin, brandName: string | null | undefined): Promise<string | null> {
  const name = brandName?.trim();
  if (!name) return null;
  const slug = slugify(name);

  const { data: existingBrand } = await supabase.from("brands").select("id").eq("slug", slug).maybeSingle();
  if (existingBrand) return existingBrand.id;

  const { data: created, error } = await supabase.from("brands").insert({ name, slug }).select("id").single();
  if (error || !created) return null;
  return created.id;
}

export async function resolveRetailerId(supabase: SupabaseAdmin, retailerName: string): Promise<string | null> {
  const name = retailerName.trim();
  if (!name) return null;
  const slug = slugify(name);

  const { data: existingRetailer } = await supabase.from("retailers").select("id").eq("slug", slug).maybeSingle();
  if (existingRetailer) return existingRetailer.id;

  const { data: created, error } = await supabase.from("retailers").insert({ name, slug }).select("id").single();
  if (error || !created) return null;
  return created.id;
}

export async function generateUniqueSlug(supabase: SupabaseAdmin, name: string): Promise<string> {
  const base = slugify(name) || "product";
  let candidate = base;
  let suffix = 2;

  // Bounded rather than infinite — a name colliding 50 times over isn't
  // realistic, but an unbounded loop here would be a real risk given
  // bulk-approve can call this many times in a row for similar names.
  for (let attempt = 0; attempt < 50; attempt++) {
    const { data: existing } = await supabase.from("products").select("id").eq("slug", candidate).maybeSingle();
    if (!existing) return candidate;
    candidate = `${base}-${suffix++}`;
  }
  return `${base}-${Date.now()}`;
}

/** Adds any images not already present for this product — never removes existing ones. Returns how many were added. */
export async function syncProductImages(supabase: SupabaseAdmin, productId: string, images: string[]): Promise<number> {
  if (images.length === 0) return 0;

  const { data: existingImages } = await supabase.from("product_images").select("url").eq("product_id", productId);
  const existingUrls = new Set((existingImages ?? []).map((i) => i.url));
  const newImages = images.filter((url) => !existingUrls.has(url));
  if (newImages.length === 0) return 0;

  const { error } = await supabase
    .from("product_images")
    .insert(newImages.map((url, i) => ({ product_id: productId, url, sort_order: existingUrls.size + i })));
  return error ? 0 : newImages.length;
}
