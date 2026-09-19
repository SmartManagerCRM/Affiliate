"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { slugify } from "@/lib/format";

function readForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const codeInput = String(formData.get("tracking_code") ?? "").trim();
  return {
    name,
    tracking_code: slugify(codeInput || name),
    activity_id: String(formData.get("activity_id") ?? "") || null,
    website: String(formData.get("website") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    active: formData.get("active") === "on",
  };
}

export async function createTrafficSource(formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readForm(formData);
  if (!values.name) redirect("/admin/traffic-sources/new?error=Name is required");

  const { error } = await supabase.from("traffic_sources").insert(values);
  if (error) redirect(`/admin/traffic-sources/new?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/traffic-sources");
  redirect("/admin/traffic-sources");
}

export async function updateTrafficSource(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readForm(formData);
  if (!values.name) redirect(`/admin/traffic-sources/${id}?error=Name is required`);

  const { error } = await supabase.from("traffic_sources").update(values).eq("id", id);
  if (error) redirect(`/admin/traffic-sources/${id}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/traffic-sources");
  redirect("/admin/traffic-sources");
}

export async function deleteTrafficSource(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  await supabase.from("traffic_sources").delete().eq("id", id);
  revalidatePath("/admin/traffic-sources");
}
