/**
 * Storage boundary for the sync engine. Keeping this as a narrow interface
 * (rather than having the engine call Supabase's fluent query builder
 * directly) means the engine's actual orchestration logic — create a run,
 * process it, complete or fail it, log errors — can be unit tested against
 * a plain in-memory fake, with no network/database dependency and no
 * Supabase client shape to mock.
 */

export type SyncRunStatus = "running" | "completed" | "failed";

export type SyncRunRecord = {
  id: string;
  networkId: string;
  status: SyncRunStatus;
  startedAt: string;
  completedAt: string | null;
  productsFound: number;
  productsImported: number;
  productsUpdated: number;
  productsRejected: number;
  errorsCount: number;
  errorMessage: string | null;
};

export type SyncRunCounts = {
  productsFound?: number;
  productsImported?: number;
  productsUpdated?: number;
  productsRejected?: number;
};

export type LogErrorParams = {
  syncRunId: string;
  networkId: string;
  errorType: string;
  errorMessage: string;
  externalId?: string | null;
  rawData?: unknown;
};

export type UpsertImportSourceParams = {
  networkId: string;
  externalProductId: string;
  externalOfferId?: string | null;
  rawData: unknown;
  /** Full normalized product snapshot — powers dedup scoring and later phases without re-parsing raw_data. */
  normalizedData: unknown;
  normalizedName: string;
  gtin: string | null;
  sku: string | null;
  brand: string | null;
};

/** "inserted" — first time this (network, external product/offer id) has been
 * seen, a new pending product_import_sources row was created. "updated" —
 * a row already existed (this is a re-sync of a known item), its data was
 * refreshed in place rather than duplicated. */
export type UpsertImportSourceOutcome = {
  outcome: "inserted" | "updated";
  importSourceId: string;
};

/** One other candidate this row could be compared against — either another
 * staged import (crossNetwork or a re-import) or an already-published product. */
export type DedupCandidate = {
  kind: "importSource" | "product";
  id: string;
  signals: {
    gtin: string | null;
    sku: string | null;
    brand: string | null;
    model: string | null;
    normalizedName: string;
  };
};

export type FindDedupCandidatesParams = {
  excludeImportSourceId: string;
  gtin: string | null;
  sku: string | null;
  normalizedName: string;
};

export type DedupResult =
  | { status: "unique" }
  | {
      status: "needs_review";
      confidence: number;
      signals: string[];
      matchImportSourceId: string | null;
      matchProductId: string | null;
    };

export interface SyncStore {
  createRun(networkId: string): Promise<SyncRunRecord>;
  completeRun(runId: string, counts: SyncRunCounts): Promise<void>;
  failRun(runId: string, errorMessage: string, errorsCount?: number): Promise<void>;
  logError(params: LogErrorParams): Promise<void>;
  upsertImportSource(params: UpsertImportSourceParams): Promise<UpsertImportSourceOutcome>;
  /** Other staged import candidates sharing an exact gtin/sku/normalized-name — a cheap, indexed pre-filter; final scoring re-checks every signal in-memory. */
  findDedupCandidateImportSources(params: FindDedupCandidatesParams): Promise<DedupCandidate[]>;
  /** Already-published products to compare against. Real products currently have no gtin/sku, so only name+brand signals are populated. */
  findPublishedProductsForDedup(): Promise<DedupCandidate[]>;
  updateDedupResult(importSourceId: string, result: DedupResult): Promise<void>;
}
