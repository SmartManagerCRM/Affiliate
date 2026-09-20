"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { NETWORK_REGISTRY, isNetworkConfigured } from "@/lib/productAutomation/registry";
import type { ImportConfig } from "@/lib/productAutomation/importConfig";

export type SyncAllResult = {
  ranNetworks: number;
  message: string;
};

/**
 * The one entry point for triggering a synchronization by hand. Phase 8's
 * scheduler will call the same underlying runNetworkSync() per connected
 * network — this action never gets a separate, less-careful code path.
 *
 * Phase 1 has no real network adapters yet (Admitad/CJ/ClickBank are all
 * "Not Connected" until their credentials + adapter land in later phases),
 * so this always finds zero connected networks and does nothing but report
 * that honestly — it never fabricates a sync result.
 */
export async function syncAllNetworks(): Promise<SyncAllResult> {
  await requireAdmin();

  const connected = NETWORK_REGISTRY.filter(isNetworkConfigured);

  if (connected.length === 0) {
    return {
      ranNetworks: 0,
      message: "No affiliate networks are connected yet — nothing to synchronize.",
    };
  }

  // Phase 2+: for each connected entry, resolve its real adapter and its
  // matching affiliate_networks row, then call runNetworkSync() per network.
  return {
    ranNetworks: 0,
    message: "Connected networks found, but no adapters are implemented yet.",
  };
}

export async function updateImportConfig(formData: FormData) {
  const { supabase } = await requireAdmin();

  const config: ImportConfig = {
    activityIds: formData.getAll("activity_ids").map(String),
    categoryIds: formData.getAll("category_ids").map(String),
    countries: String(formData.get("countries") ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    minScore: Math.min(100, Math.max(0, Number(formData.get("min_score") ?? 0) || 0)),
    // Auto-publish stays an explicit, deliberate opt-in every time this
    // form is saved — it's never left on implicitly.
    autoPublish: formData.get("auto_publish") === "on",
  };

  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key: "product_automation_config", value: config, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) {
    redirect(`/admin/product-automation?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/product-automation");
  redirect("/admin/product-automation?saved=1");
}
