"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";

export async function updateSettings(formData: FormData) {
  const { supabase } = await requireAdmin();

  const entries: Record<string, string> = {
    site_name: String(formData.get("site_name") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim(),
    affiliate_disclosure: String(formData.get("affiliate_disclosure") ?? "").trim(),
    contact_email: String(formData.get("contact_email") ?? "").trim(),
  };

  await supabase.from("site_settings").upsert(
    Object.entries(entries).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "key" }
  );

  revalidatePath("/admin/settings");
  revalidatePath("/");
  redirect("/admin/settings?saved=1");
}
