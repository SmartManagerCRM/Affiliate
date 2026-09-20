import type { NormalizedProduct } from "../types";

/**
 * Storage boundary for classification, kept separate from SyncStore
 * (Phase 2/3's per-network-sync-run abstraction) because classification
 * runs as its own pass across every network's pending candidates, not
 * scoped to one sync run.
 */

export type ClassificationTaxonomy = {
  activities: { id: string; name: string }[];
  categories: { id: string; name: string; activityId: string }[];
};

export type PendingClassificationCandidate = {
  importSourceId: string;
  product: NormalizedProduct;
};

export type ClassificationResult =
  | {
      status: "classified";
      activityId: string;
      categoryIds: string[];
      countries: string[];
      confidence: number;
      reason: string;
      attempts: number;
    }
  | { status: "classification_failed"; error: string; attempts: number };

export interface ClassificationStore {
  /** The real, current set of activities/categories — the only ids classification is ever allowed to return. */
  loadTaxonomy(): Promise<ClassificationTaxonomy>;
  /** Staged candidates not yet classified, oldest first. */
  findPendingCandidates(limit: number): Promise<PendingClassificationCandidate[]>;
  updateClassificationResult(importSourceId: string, result: ClassificationResult): Promise<void>;
}
