"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { slugify } from "@/lib/format";
import { readTranslationsFromForm } from "@/lib/adminTranslations";
import type { createClient } from "@/lib/supabase/server";

async function resolveBrandId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandName: string
) {
  const name = brandName.trim();
  if (!name) return null;
  const slug = slugify(name);

  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("brands")
    .insert({ name, slug })
    .select("id")
    .single();
  if (error) return null;
  return created.id;
}

async function readBasicForm(
  formData: FormData,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const brandName = String(formData.get("brand_name") ?? "").trim();
  return {
    name,
    slug: slugify(slugInput || name),
    brand_id: await resolveBrandId(supabase, brandName),
    short_description: String(formData.get("short_description") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    status: String(formData.get("status") ?? "draft"),
    featured: formData.get("featured") === "on",
    seo_title: String(formData.get("seo_title") ?? "").trim() || null,
    seo_description: String(formData.get("seo_description") ?? "").trim() || null,
    translations: readTranslationsFromForm(formData, [
      "name",
      "short_description",
      "description",
      "seo_title",
      "seo_description",
    ]),
  };
}

export async function createProduct(formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = await readBasicForm(formData, supabase);
  if (!values.name) redirect("/admin/products/new?error=Name is required");

  const { data, error } = await supabase.from("products").insert(values).select("id").single();
  if (error) redirect(`/admin/products/new?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/products");
  redirect(`/admin/products/${data!.id}`);
}

export async function updateProductBasics(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = await readBasicForm(formData, supabase);
  if (!values.name) redirect(`/admin/products/${id}?error=Name is required`);

  const { data: existing } = await supabase.from("products").select("slug").eq("id", id).single();

  const { error } = await supabase.from("products").update(values).eq("id", id);
  if (error) redirect(`/admin/products/${id}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath(`/product/${values.slug}`);
  if (existing?.slug) revalidatePath(`/product/${existing.slug}`);
  revalidatePath("/");
  redirect(`/admin/products/${id}?saved=1`);
}

export async function updateProductMainImage(id: string, url: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("products").update({ main_image: url }).eq("id", id);
  revalidatePath(`/admin/products/${id}`);
}

export async function deleteProduct(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function updateProductTaxonomy(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const activityIds = formData.getAll("activity_ids").map(String);
  const categoryIds = formData.getAll("category_ids").map(String);

  await supabase.from("product_activities").delete().eq("product_id", id);
  await supabase.from("product_categories").delete().eq("product_id", id);

  if (activityIds.length > 0) {
    await supabase
      .from("product_activities")
      .insert(activityIds.map((activity_id) => ({ product_id: id, activity_id })));
  }
  if (categoryIds.length > 0) {
    await supabase
      .from("product_categories")
      .insert(categoryIds.map((category_id) => ({ product_id: id, category_id })));
  }

  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/");
  redirect(`/admin/products/${id}?saved=1`);
}
