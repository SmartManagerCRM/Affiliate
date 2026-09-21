import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { NETWORK_REGISTRY, isNetworkConfigured } from "../registry";
import { getAdapterForNetwork } from "../adapterFactory";
import { AdmitadAdapter } from "../adapters/admitad/admitadAdapter";
import { listSyncableAdmitadPrograms, recordProgramSyncResult } from "../adapters/admitad/programsStore";
import { CjAdapter } from "../adapters/cj/cjAdapter";
import { listSyncableCjPrograms, recordCjProgramSyncResult } from "../adapters/cj/programsStore";
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
    if (entry.key === "admitad") {
      const outcome = await runAdmitadPrograms(supabase, store, entry.label);
      ranNetworks += outcome.ranPrograms;
      results.push(outcome.message);
      continue;
    }

    if (entry.key === "cj") {
      const outcome = await runCjPrograms(supabase, store, entry.label);
      ranNetworks += outcome.ranPrograms;
      results.push(outcome.message);
      continue;
    }

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

/**
 * Syncs every active Admitad program that has a feed URL, sharing ONE
 * authenticated AdmitadAdapter instance across all of them (one OAuth
 * token fetch for the whole batch, not one per program). Each program's
 * own admitad_programs row records its own last_synced_at/last_sync_status
 * afterward, independent of the others — one program failing never stops
 * the rest from syncing.
 */
async function runAdmitadPrograms(
  supabase: SupabaseAdmin,
  store: SupabaseSyncStore,
  label: string
): Promise<{ ranPrograms: number; message: string }> {
  const { data: networkRow } = await supabase.from("affiliate_networks").select("id").ilike("name", label).maybeSingle();
  if (!networkRow) {
    return { ranPrograms: 0, message: `${label}: connected, but no matching affiliate_networks row was found.` };
  }

  const programs = await listSyncableAdmitadPrograms(supabase);
  if (programs.length === 0) {
    return {
      ranPrograms: 0,
      message: `${label}: connected, but no active program has a feed URL configured yet — add one in Admitad Programs.`,
    };
  }

  const adapter = new AdmitadAdapter();
  const parts: string[] = [];
  let ranPrograms = 0;

  for (const program of programs) {
    // listSyncableAdmitadPrograms already filters to feed_url IS NOT NULL,
    // but the type is still nullable — this satisfies TypeScript without
    // weakening that filter.
    if (!program.feedUrl) continue;

    const outcome = await runNetworkSync(store, networkRow.id, adapter, { feedUrl: program.feedUrl, programId: program.id });
    ranPrograms += 1;
    await recordProgramSyncResult(supabase, program.id, { status: outcome.status, errorMessage: outcome.errorMessage });
    parts.push(
      outcome.status === "completed"
        ? `${program.advertiserName}: imported ${outcome.productsImported}, updated ${outcome.productsUpdated}, rejected ${outcome.productsRejected} (of ${outcome.productsFound} found)`
        : `${program.advertiserName}: sync failed — ${outcome.errorMessage}`
    );
  }

  return { ranPrograms, message: `${label} [${parts.join("; ")}].` };
}

/**
 * Syncs every active CJ program (advertiser), sharing ONE CjAdapter instance
 * across all of them — mirrors runAdmitadPrograms() above, but filters by
 * advertiserId (cj_advertiser_id) per call instead of a feed URL, since CJ's
 * product API has no per-program feed concept. Each program's own
 * cj_programs row records its own last_synced_at/last_sync_status
 * afterward, independent of the others — one advertiser failing never stops
 * the rest from syncing. Exported so the standalone "Sync CJ" admin action
 * (actions/cjPrograms.ts) can run exactly this same path without going
 * through the full Sync All pipeline (classification, auto-update, Admitad).
 */
export async function runCjPrograms(
  supabase: SupabaseAdmin,
  store: SupabaseSyncStore,
  label: string
): Promise<{ ranPrograms: number; message: string }> {
  const { data: networkRow } = await supabase.from("affiliate_networks").select("id").ilike("name", label).maybeSingle();
  if (!networkRow) {
    return { ranPrograms: 0, message: `${label}: connected, but no matching affiliate_networks row was found.` };
  }

  const programs = await listSyncableCjPrograms(supabase);
  if (programs.length === 0) {
    return {
      ranPrograms: 0,
      message: `${label}: connected, but no advertiser is enabled yet — enable one in CJ Programs.`,
    };
  }

  const adapter = new CjAdapter();
  const parts: string[] = [];
  let ranPrograms = 0;

  for (const program of programs) {
    const outcome = await runNetworkSync(store, networkRow.id, adapter, { advertiserId: program.cjAdvertiserId, programId: program.id });
    ranPrograms += 1;
    await recordCjProgramSyncResult(supabase, program.id, { status: outcome.status, errorMessage: outcome.errorMessage });
    parts.push(
      outcome.status === "completed"
        ? `${program.advertiserName}: imported ${outcome.productsImported}, updated ${outcome.productsUpdated}, rejected ${outcome.productsRejected} (of ${outcome.productsFound} found)`
        : `${program.advertiserName}: sync failed — ${outcome.errorMessage}`
    );
  }

  return { ranPrograms, message: `${label} [${parts.join("; ")}].` };
}
