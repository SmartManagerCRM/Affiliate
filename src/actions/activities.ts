"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { slugify } from "@/lib/format";
import { readTranslationsFromForm } from "@/lib/adminTranslations";

function readActivityForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  return {
    name,
    slug: slugify(slugInput || name),
    description: String(formData.get("description") ?? "").trim() || null,
    icon: String(formData.get("icon") ?? "").trim() || null,
    sort_order: Number(formData.get("sort_order") ?? 0),
    active: formData.get("active") === "on",
    seo_title: String(formData.get("seo_title") ?? "").trim() || null,
    seo_description: String(formData.get("seo_description") ?? "").trim() || null,
    translations: readTranslationsFromForm(formData, [
      "name",
      "description",
      "seo_title",
      "seo_description",
    ]),
  };
}

export async function createActivity(formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readActivityForm(formData);

  if (!values.name) redirect("/admin/activities/new?error=Name is required");

  const { error } = await supabase.from("activities").insert(values);
  if (error) redirect(`/admin/activities/new?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/activities");
  revalidatePath("/");
  redirect("/admin/activities");
}

export async function updateActivity(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readActivityForm(formData);

  if (!values.name) redirect(`/admin/activities/${id}?error=Name is required`);

  const { error } = await supabase.from("activities").update(values).eq("id", id);
  if (error) redirect(`/admin/activities/${id}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/activities");
  revalidatePath("/");
  revalidatePath(`/${values.slug}`);
  redirect("/admin/activities");
}

export async function deleteActivity(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  await supabase.from("activities").delete().eq("id", id);
  revalidatePath("/admin/activities");
  revalidatePath("/");
}
