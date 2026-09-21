import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { NETWORK_REGISTRY, isNetworkConfigured } from "../registry";
import { getAdapterForNetwork } from "../adapterFactory";
import { SupabaseSyncStore } from "../supabaseSyncStore";
import { runNetworkSync } from "../syncEngine";
import { isClassificationConfigured, AnthropicClassificationClient } from "../classification/anthropicClient";
import { SupabaseClassificationStore } from "../classification/supabaseClassificationStore";
import { classifyPendingProducts, describeClassificationRun } from "../classification/classifyEngine";
import { autoUpdateApprovedProducts } from "../update/autoUpdateEngine";
import { describeAutoUpdateRun } from "../update/describeAutoUpdateRun";
import { acquireSyncLock, releaseSyncLock } from "./syncLock";

type SupabaseAdmin = Awaited<ReturnType<typeof createClient>>;

export type SyncAllResult = {
  ranNetworks: number;
  message: string;
};

/**
 * The one implementation of the full sync pipeline (network syncs ->
 * classification -> automatic updates) — the admin's "Sync Now" button
 * and the scheduled/cron trigger both call this exact function, never two
 * separate implementations (Phase 8's explicit requirement).
 *
 * Wrapped in the single-row product_sync_lock mutex so a scheduled run
 * and a manual "Sync Now" (or two overlapping scheduler ticks) can never
 * run concurrently against the same catalog — a second caller gets a
 * clear "already running" result instead of racing the first.
 */
export async function runScheduledSync(supabase: SupabaseAdmin, options: { lockedBy?: string } = {}): Promise<SyncAllResult> {
  const lock = await acquireSyncLock(supabase, { lockedBy: options.lockedBy ?? "sync" });
  if (!lock.acquired) {
    return { ranNetworks: 0, message: `Sync skipped: ${lock.reason}` };
  }

  try {
    return await runSyncPipeline(supabase);
  } finally {
    await releaseSyncLock(supabase);
  }
}

async function runSyncPipeline(supabase: SupabaseAdmin): Promise<SyncAllResult> {
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

  // Continue the pipeline into classification, but only ever honestly —
  // skipped entirely (not faked) when no AI key is configured.
  if (isClassificationConfigured()) {
    const classificationStore = new SupabaseClassificationStore(supabase);
    const classificationClient = new AnthropicClassificationClient();
    const summary = await classifyPendingProducts(classificationStore, classificationClient);
    results.push(describeClassificationRun(summary));
  } else {
    results.push("Classification: ANTHROPIC_API_KEY is not configured — skipped.");
  }

  // Propagate fresh feed data to already-approved products/offers — no
  // external dependency, always runs.
  const autoUpdateSummary = await autoUpdateApprovedProducts(supabase);
  results.push(describeAutoUpdateRun(autoUpdateSummary));

  return {
    ranNetworks,
    message: results.join(" "),
  };
}
