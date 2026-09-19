"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";

function readNetworkForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim() || null,
    active: formData.get("active") === "on",
  };
}

export async function createNetwork(formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readNetworkForm(formData);
  if (!values.name) redirect("/admin/networks/new?error=Name is required");

  const { error } = await supabase.from("affiliate_networks").insert(values);
  if (error) redirect(`/admin/networks/new?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/networks");
  redirect("/admin/networks");
}

export async function updateNetwork(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const values = readNetworkForm(formData);
  if (!values.name) redirect(`/admin/networks/${id}?error=Name is required`);

  const { error } = await supabase.from("affiliate_networks").update(values).eq("id", id);
  if (error) redirect(`/admin/networks/${id}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/networks");
  redirect("/admin/networks");
}

export async function deleteNetwork(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  await supabase.from("affiliate_networks").delete().eq("id", id);
  revalidatePath("/admin/networks");
}
