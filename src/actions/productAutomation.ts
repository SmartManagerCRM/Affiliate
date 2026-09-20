"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { NETWORK_REGISTRY, isNetworkConfigured } from "@/lib/productAutomation/registry";
import { getAdapterForNetwork } from "@/lib/productAutomation/adapterFactory";
import { SupabaseSyncStore } from "@/lib/productAutomation/supabaseSyncStore";
import { runNetworkSync } from "@/lib/productAutomation/syncEngine";
import type { ImportConfig } from "@/lib/productAutomation/importConfig";

export type SyncAllResult = {
  ranNetworks: number;
  message: string;
};

/**
 * The one entry point for triggering a synchronization by hand. Phase 8's
 * scheduler will call this same runNetworkSync() path per connected
 * network — this action never gets a separate, less-careful code path.
 *
 * Only networks that are both (a) configured (real credentials present)
 * and (b) have a real adapter implemented get synced. CJ/ClickBank have
 * neither yet, so they're always skipped honestly rather than faked.
 */
export async function syncAllNetworks(): Promise<SyncAllResult> {
  const { supabase } = await requireAdmin();

  const connected = NETWORK_REGISTRY.filter(isNetworkConfigured);

  if (connected.length === 0) {
    return {
      ranNetworks: 0,
      message: "No affiliate networks are connected yet — nothing to synchronize.",
    };
  }

  const store = new SupabaseSyncStore(supabase);
  const results: string[] = [];
  let ranNetworks = 0;

  for (const entry of connected) {
    const adapter = getAdapterForNetwork(entry.key);
    if (!adapter) {
      results.push(`${entry.label}: connected, but no adapter is implemented yet.`);
      continue;
    }

    const { data: networkRow } = await supabase
      .from("affiliate_networks")
      .select("id")
      .ilike("name", entry.label)
      .maybeSingle();

    if (!networkRow) {
      results.push(`${entry.label}: connected, but no matching affiliate_networks row was found.`);
      continue;
    }

    const outcome = await runNetworkSync(store, networkRow.id, adapter);
    ranNetworks += 1;
    results.push(
      outcome.status === "completed"
        ? `${entry.label}: imported ${outcome.productsImported}, updated ${outcome.productsUpdated}, rejected ${outcome.productsRejected} (of ${outcome.productsFound} found).`
        : `${entry.label}: sync failed — ${outcome.errorMessage}`
    );
  }

  revalidatePath("/admin/product-automation");
  revalidatePath("/admin/product-automation/history");

  return {
    ranNetworks,
    message: results.join(" "),
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
