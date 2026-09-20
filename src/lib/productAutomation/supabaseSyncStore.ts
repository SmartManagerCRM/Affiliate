import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type {
  LogErrorParams,
  SyncRunCounts,
  SyncRunRecord,
  SyncStore,
  UpsertImportSourceOutcome,
  UpsertImportSourceParams,
} from "./syncStore";

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

  async upsertImportSource(params: UpsertImportSourceParams): Promise<UpsertImportSourceOutcome> {
    // No DB-level unique constraint exists yet (deliberately — Phase 3
    // designs real dedup using multiple signals, not just external id), so
    // this does an application-level select-then-write. At Phase 2's scale
    // (one sync run at a time, not yet concurrent) this is safe; Phase 8's
    // concurrency lock will guard the "two runs at once" case.
    let query = this.supabase
      .from("product_import_sources")
      .select("id")
      .eq("network_id", params.networkId)
      .eq("external_product_id", params.externalProductId);

    query = params.externalOfferId
      ? query.eq("external_offer_id", params.externalOfferId)
      : query.is("external_offer_id", null);

    const { data: existing, error: selectError } = await query.maybeSingle();
    if (selectError) throw new Error(selectError.message);

    const now = new Date().toISOString();

    if (existing) {
      const { error } = await this.supabase
        .from("product_import_sources")
        .update({ raw_data: params.rawData as never, last_synced_at: now, updated_at: now })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return "updated";
    }

    const { error } = await this.supabase.from("product_import_sources").insert({
      network_id: params.networkId,
      external_product_id: params.externalProductId,
      external_offer_id: params.externalOfferId ?? null,
      raw_data: params.rawData as never,
      import_status: "pending",
      last_synced_at: now,
    });
    if (error) throw new Error(error.message);
    return "inserted";
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
