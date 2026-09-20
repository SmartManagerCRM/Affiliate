import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type {
  DedupCandidate,
  DedupResult,
  FindDedupCandidatesParams,
  LogErrorParams,
  ProductOffer,
  QualityScoreFactors,
  ScoringResult,
  SyncRunCounts,
  SyncRunRecord,
  SyncStore,
  UpsertImportSourceOutcome,
  UpsertImportSourceParams,
} from "./syncStore";
import { normalizeNameForMatch } from "./dedup";
import { QUALITY_SCORE_WEIGHTS } from "./scoring/qualityScore";

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
    // No DB-level unique constraint exists yet (deliberately — dedup uses
    // multiple signals, not just external id), so this does an
    // application-level select-then-write. At the current scale (one sync
    // run at a time, not yet concurrent) this is safe; Phase 8's
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
    const normalizedFields = {
      raw_data: params.rawData as never,
      normalized_data: params.normalizedData as never,
      normalized_name: params.normalizedName,
      gtin: params.gtin,
      sku: params.sku,
      brand: params.brand,
    };

    if (existing) {
      const { error } = await this.supabase
        .from("product_import_sources")
        .update({ ...normalizedFields, last_synced_at: now, updated_at: now })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { outcome: "updated", importSourceId: existing.id };
    }

    const { data: inserted, error } = await this.supabase
      .from("product_import_sources")
      .insert({
        network_id: params.networkId,
        external_product_id: params.externalProductId,
        external_offer_id: params.externalOfferId ?? null,
        ...normalizedFields,
        import_status: "pending",
        last_synced_at: now,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Failed to insert import source");
    return { outcome: "inserted", importSourceId: inserted.id };
  }

  async findDedupCandidateImportSources(params: FindDedupCandidatesParams): Promise<DedupCandidate[]> {
    const SELECT = "id, gtin, sku, brand, normalized_name, normalized_data";

    // Three separate parameterized .eq() queries (rather than one .or()
    // with these values interpolated into a raw filter string) — gtin/sku
    // come straight from an external feed and could contain characters
    // (commas, parentheses) that would corrupt or hijack a hand-built
    // PostgREST filter expression.
    const queries = [];

    if (params.gtin) {
      queries.push(
        this.supabase
          .from("product_import_sources")
          .select(SELECT)
          .neq("id", params.excludeImportSourceId)
          .not("import_status", "in", "(rejected,failed)")
          .eq("gtin", params.gtin)
      );
    }
    if (params.sku) {
      queries.push(
        this.supabase
          .from("product_import_sources")
          .select(SELECT)
          .neq("id", params.excludeImportSourceId)
          .not("import_status", "in", "(rejected,failed)")
          .eq("sku", params.sku)
      );
    }
    if (params.normalizedName) {
      queries.push(
        this.supabase
          .from("product_import_sources")
          .select(SELECT)
          .neq("id", params.excludeImportSourceId)
          .not("import_status", "in", "(rejected,failed)")
          .eq("normalized_name", params.normalizedName)
      );
    }

    if (queries.length === 0) return [];

    const results = await Promise.all(queries);

    type CandidateRow = {
      id: string;
      gtin: string | null;
      sku: string | null;
      brand: string | null;
      normalized_name: string | null;
      normalized_data: unknown;
    };

    const byId = new Map<string, CandidateRow>();
    for (const { data, error } of results) {
      if (error) throw new Error(error.message);
      for (const row of (data ?? []) as CandidateRow[]) {
        byId.set(row.id, row);
      }
    }

    return Array.from(byId.values()).map((row) => ({
      kind: "importSource" as const,
      id: row.id,
      signals: {
        gtin: row.gtin,
        sku: row.sku,
        brand: row.brand,
        model: extractModel(row.normalized_data),
        normalizedName: row.normalized_name ?? "",
      },
    }));
  }

  async findPublishedProductsForDedup(): Promise<DedupCandidate[]> {
    // Real products have no gtin/sku/model columns yet, so only name+brand
    // signals are available on this side of the comparison. The catalog is
    // small enough today to scan in memory; revisit if it grows large.
    const { data, error } = await this.supabase
      .from("products")
      .select("id, name, brands(name)")
      .eq("status", "published");

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      kind: "product" as const,
      id: row.id,
      signals: {
        gtin: null,
        sku: null,
        brand: row.brands?.name?.trim().toLowerCase() || null,
        model: null,
        normalizedName: normalizeNameForMatch(row.name),
      },
    }));
  }

  async updateDedupResult(importSourceId: string, result: DedupResult): Promise<void> {
    if (result.status === "unique") {
      const { error } = await this.supabase
        .from("product_import_sources")
        .update({
          dedup_status: "unique",
          dedup_confidence: null,
          dedup_signals: [],
          dedup_match_source_id: null,
          dedup_match_product_id: null,
        })
        .eq("id", importSourceId);
      if (error) throw new Error(error.message);
      return;
    }

    const update: Record<string, unknown> = {
      dedup_status: "needs_review",
      dedup_confidence: result.confidence,
      dedup_signals: result.signals,
      dedup_match_source_id: result.matchImportSourceId,
      dedup_match_product_id: result.matchProductId,
    };

    // This row may be the earlier half of a mutually-matched pair: it was
    // already normalized+scored as "unique" (quality_score included the
    // dedup-clean bonus) before the later half arrived and revealed the
    // match. Keep quality_score honest by removing that bonus now rather
    // than leaving a needs_review row with a stale, too-high score.
    const { data: current, error: readError } = await this.supabase
      .from("product_import_sources")
      .select("quality_score, quality_score_factors")
      .eq("id", importSourceId)
      .single();
    if (readError) throw new Error(readError.message);

    const factors = (current?.quality_score_factors ?? {}) as Partial<QualityScoreFactors>;
    if (factors.isDedupClean) {
      update.quality_score = Math.max(0, (current?.quality_score ?? 0) - QUALITY_SCORE_WEIGHTS.dedupClean);
      update.quality_score_factors = { ...factors, isDedupClean: false };
    }

    const { error } = await this.supabase.from("product_import_sources").update(update as never).eq("id", importSourceId);
    if (error) throw new Error(error.message);
  }

  async findOffersForProduct(productId: string): Promise<ProductOffer[]> {
    const { data, error } = await this.supabase
      .from("offers")
      .select("price, currency")
      .eq("product_id", productId)
      .eq("active", true);

    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({ price: row.price, currency: row.currency }));
  }

  async updateScoringResult(importSourceId: string, result: ScoringResult): Promise<void> {
    const { error } = await this.supabase
      .from("product_import_sources")
      .update({
        quality_score: result.qualityScore,
        quality_score_factors: result.qualityFactors as never,
        opportunity_signal: result.opportunitySignal as never,
      })
      .eq("id", importSourceId);

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

/** normalized_data is stored as opaque jsonb — pull `model` back out defensively rather than trusting its shape. */
function extractModel(normalizedData: unknown): string | null {
  if (!normalizedData || typeof normalizedData !== "object") return null;
  const model = (normalizedData as { model?: unknown }).model;
  return typeof model === "string" && model.trim() ? model.trim().toLowerCase() : null;
}
