"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { slugify } from "@/lib/format";

function readCategoryForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  return {
    name,
    slug: slugify(slugInput || name),
    activity_id: String(formData.get("activity_id") ?? ""),
    description: String(formData.get("description") ?? "").trim() || null,
    sort_order: Number(formData.get("sort_order") ?? 0),
    active: formData.get("active") === "on",
  };
}

export async function createCategory(formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readCategoryForm(formData);
  if (!values.name || !values.activity_id) {
    redirect("/admin/categories/new?error=Name and activity are required");
  }

  const { error } = await supabase.from("categories").insert(values);
  if (error) redirect(`/admin/categories/new?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function updateCategory(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readCategoryForm(formData);
  if (!values.name || !values.activity_id) {
    redirect(`/admin/categories/${id}?error=Name and activity are required`);
  }

  const { error } = await supabase.from("categories").update(values).eq("id", id);
  if (error) redirect(`/admin/categories/${id}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function deleteCategory(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  await supabase.from("categories").delete().eq("id", id);
  revalidatePath("/admin/categories");
}
