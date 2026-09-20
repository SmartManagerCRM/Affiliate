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

export interface SyncStore {
  createRun(networkId: string): Promise<SyncRunRecord>;
  completeRun(runId: string, counts: SyncRunCounts): Promise<void>;
  failRun(runId: string, errorMessage: string, errorsCount?: number): Promise<void>;
  logError(params: LogErrorParams): Promise<void>;
}
