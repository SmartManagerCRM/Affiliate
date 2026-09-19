"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { slugify } from "@/lib/format";

function readRetailerForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  return {
    name,
    slug: slugify(slugInput || name),
    logo: String(formData.get("logo") ?? "").trim() || null,
    website: String(formData.get("website") ?? "").trim() || null,
    country: String(formData.get("country") ?? "").trim() || null,
    currency: String(formData.get("currency") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    active: formData.get("active") === "on",
  };
}

export async function createRetailer(formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readRetailerForm(formData);
  if (!values.name) redirect("/admin/retailers/new?error=Name is required");

  const { error } = await supabase.from("retailers").insert(values);
  if (error) redirect(`/admin/retailers/new?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/retailers");
  redirect("/admin/retailers");
}

export async function updateRetailer(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readRetailerForm(formData);
  if (!values.name) redirect(`/admin/retailers/${id}?error=Name is required`);

  const { error } = await supabase.from("retailers").update(values).eq("id", id);
  if (error) redirect(`/admin/retailers/${id}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/retailers");
  redirect("/admin/retailers");
}

export async function deleteRetailer(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  await supabase.from("retailers").delete().eq("id", id);
  revalidatePath("/admin/retailers");
}
