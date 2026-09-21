"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { runScheduledSync, type SyncAllResult } from "@/lib/productAutomation/scheduler/runScheduledSync";
import { isClassificationConfigured, AnthropicClassificationClient } from "@/lib/productAutomation/classification/anthropicClient";
import { SupabaseClassificationStore } from "@/lib/productAutomation/classification/supabaseClassificationStore";
import { classifyPendingProducts, describeClassificationRun } from "@/lib/productAutomation/classification/classifyEngine";
import { autoUpdateApprovedProducts } from "@/lib/productAutomation/update/autoUpdateEngine";
import { describeAutoUpdateRun } from "@/lib/productAutomation/update/describeAutoUpdateRun";
import type { ImportConfig } from "@/lib/productAutomation/importConfig";

export type { SyncAllResult };

/**
 * The one entry point for triggering a synchronization by hand. Calls the
 * exact same runScheduledSync() the cron endpoint (/api/cron/sync-products)
 * calls — there is no separate, less-careful "Sync Now" implementation.
 */
export async function syncAllNetworks(): Promise<SyncAllResult> {
  const { supabase, admin } = await requireAdmin();

  try {
    const result = await runScheduledSync(supabase, { lockedBy: `admin:${admin.email}` });

    revalidatePath("/admin/product-automation");
    revalidatePath("/admin/product-automation/history");
    revalidatePath("/admin/products");
    revalidatePath("/admin/offers");

    return result;
  } catch (err) {
    // Never let an unexpected failure escape as an uncaught Server Action
    // error — that crashes the whole page with a generic "server error"
    // instead of showing the admin what went wrong.
    const message = err instanceof Error ? err.message : "Unknown error.";
    return { ranNetworks: 0, message: `Sync failed: ${message}` };
  }
}

export type AutoUpdateResult = {
  message: string;
};

/** Standalone auto-update pass, independent of "Sync Now" — useful for propagating a manual candidate edit without a full re-sync. */
export async function autoUpdateApprovedProductsAction(): Promise<AutoUpdateResult> {
  const { supabase } = await requireAdmin();
  const summary = await autoUpdateApprovedProducts(supabase);

  revalidatePath("/admin/product-automation");
  revalidatePath("/admin/products");
  revalidatePath("/admin/offers");

  return { message: describeAutoUpdateRun(summary) };
}

export type ClassifyPendingResult = {
  message: string;
};

/** Standalone classification pass, independent of "Sync Now" — useful for working through a backlog or after adding ANTHROPIC_API_KEY. */
export async function classifyPendingProductsAction(): Promise<ClassifyPendingResult> {
  const { supabase } = await requireAdmin();

  if (!isClassificationConfigured()) {
    return { message: "ANTHROPIC_API_KEY is not configured — nothing to classify." };
  }

  const store = new SupabaseClassificationStore(supabase);
  const client = new AnthropicClassificationClient();
  const summary = await classifyPendingProducts(store, client);

  revalidatePath("/admin/product-automation");

  return { message: describeClassificationRun(summary) };
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
    syncIntervalHours: Math.max(1, Number(formData.get("sync_interval_hours") ?? 6) || 6),
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
