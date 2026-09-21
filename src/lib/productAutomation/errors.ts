import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { AUTO_UPDATE_ERROR_TYPES } from "./update/autoUpdateEngine";

type SupabaseAdmin = Awaited<ReturnType<typeof createClient>>;

export type ImportErrorSource = "sync" | "auto_update";

export type ImportErrorRow = {
  id: string;
  source: ImportErrorSource;
  syncRunId: string | null;
  networkName: string | null;
  externalId: string | null;
  errorType: string;
  errorMessage: string;
  createdAt: string;
};

/** Pure classification of a product_import_errors row's origin, by its error_type — kept in sync with the constants autoUpdateEngine actually writes. */
export function classifyErrorSource(errorType: string): ImportErrorSource {
  return (AUTO_UPDATE_ERROR_TYPES as readonly string[]).includes(errorType) ? "auto_update" : "sync";
}

/** Most recent product_import_errors rows from every source (network syncs and auto-update passes), newest first. */
export async function getRecentImportErrors(supabase: SupabaseAdmin, limit = 20): Promise<ImportErrorRow[]> {
  const { data } = await supabase
    .from("product_import_errors")
    .select("id, sync_run_id, external_id, error_type, error_message, created_at, network:affiliate_networks(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    source: classifyErrorSource(row.error_type),
    syncRunId: row.sync_run_id,
    networkName: row.network?.name ?? null,
    externalId: row.external_id,
    errorType: row.error_type,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }));
}

/** product_import_errors rows for a specific set of sync runs, grouped by sync_run_id — used to show per-run detail on the Sync History page. */
export async function getImportErrorsBySyncRun(
  supabase: SupabaseAdmin,
  syncRunIds: string[]
): Promise<Map<string, ImportErrorRow[]>> {
  const byRun = new Map<string, ImportErrorRow[]>();
  if (syncRunIds.length === 0) return byRun;

  const { data } = await supabase
    .from("product_import_errors")
    .select("id, sync_run_id, external_id, error_type, error_message, created_at, network:affiliate_networks(name)")
    .in("sync_run_id", syncRunIds)
    .order("created_at", { ascending: false })
    .limit(2000);

  for (const row of data ?? []) {
    if (!row.sync_run_id) continue;
    const entry: ImportErrorRow = {
      id: row.id,
      source: classifyErrorSource(row.error_type),
      syncRunId: row.sync_run_id,
      networkName: row.network?.name ?? null,
      externalId: row.external_id,
      errorType: row.error_type,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    };
    const existing = byRun.get(row.sync_run_id);
    if (existing) existing.push(entry);
    else byRun.set(row.sync_run_id, [entry]);
  }

  return byRun;
}
