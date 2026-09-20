import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { LogErrorParams, SyncRunCounts, SyncRunRecord, SyncStore } from "./syncStore";

type SupabaseAdmin = Awaited<ReturnType<typeof createClient>>;

function toRecord(row: {
  id: string;
  network_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  products_found: number;
  products_imported: number;
  products_updated: number;
  products_rejected: number;
  errors_count: number;
  error_message: string | null;
}): SyncRunRecord {
  return {
    id: row.id,
    networkId: row.network_id ?? "",
    status: row.status as SyncRunRecord["status"],
    startedAt: row.started_at,
    completedAt: row.completed_at,
    productsFound: row.products_found,
    productsImported: row.products_imported,
    productsUpdated: row.products_updated,
    productsRejected: row.products_rejected,
    errorsCount: row.errors_count,
    errorMessage: row.error_message,
  };
}

/** Production SyncStore backed by product_sync_runs / product_import_errors, via the admin's RLS-scoped session. */
export class SupabaseSyncStore implements SyncStore {
  constructor(private readonly supabase: SupabaseAdmin) {}

  async createRun(networkId: string): Promise<SyncRunRecord> {
    const { data, error } = await this.supabase
      .from("product_sync_runs")
      .insert({ network_id: networkId, status: "running" })
      .select(
        "id, network_id, status, started_at, completed_at, products_found, products_imported, products_updated, products_rejected, errors_count, error_message"
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create sync run");
    }

    return toRecord(data);
  }

  async completeRun(runId: string, counts: SyncRunCounts): Promise<void> {
    const { error } = await this.supabase
      .from("product_sync_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        ...(counts.productsFound !== undefined && { products_found: counts.productsFound }),
        ...(counts.productsImported !== undefined && { products_imported: counts.productsImported }),
        ...(counts.productsUpdated !== undefined && { products_updated: counts.productsUpdated }),
        ...(counts.productsRejected !== undefined && { products_rejected: counts.productsRejected }),
      })
      .eq("id", runId);

    if (error) throw new Error(error.message);
  }

  async failRun(runId: string, errorMessage: string, errorsCount = 1): Promise<void> {
    const { error } = await this.supabase
      .from("product_sync_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        errors_count: errorsCount,
        error_message: errorMessage,
      })
      .eq("id", runId);

    if (error) throw new Error(error.message);
  }

  async logError(params: LogErrorParams): Promise<void> {
    const { error } = await this.supabase.from("product_import_errors").insert({
      sync_run_id: params.syncRunId,
      network_id: params.networkId,
      external_id: params.externalId ?? null,
      error_type: params.errorType,
      error_message: params.errorMessage,
      raw_data: (params.rawData as never) ?? null,
    });

    if (error) throw new Error(error.message);
  }
}
