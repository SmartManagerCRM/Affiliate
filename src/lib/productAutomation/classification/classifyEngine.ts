import type { NormalizedProduct } from "../types";
import type { ClassificationResult, ClassificationStore, ClassificationTaxonomy } from "./classificationStore";
import { validateClassificationResult } from "./schema";

/** Anything that can turn a product + taxonomy into a raw (unvalidated) classification response. */
export interface ClassificationClient {
  classify(product: NormalizedProduct, taxonomy: ClassificationTaxonomy): Promise<unknown>;
}

/** "retry once on invalid JSON [or any other failure], then mark classification_failed" — never a third attempt, never a partial/fabricated result. */
const MAX_ATTEMPTS = 2;

/** Classifies a single product. Pure with respect to storage — the caller writes the result. */
export async function classifyOne(
  client: ClassificationClient,
  product: NormalizedProduct,
  taxonomy: ClassificationTaxonomy
): Promise<ClassificationResult> {
  let lastError = "Unknown classification error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await client.classify(product, taxonomy);
      const validation = validateClassificationResult(raw, taxonomy);

      if (validation.valid) {
        return { status: "classified", ...validation.result, attempts: attempt };
      }
      lastError = validation.errorMessage;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown classification error";
    }
  }

  return { status: "classification_failed", error: lastError, attempts: MAX_ATTEMPTS };
}

export type ClassificationRunSummary = {
  candidatesFound: number;
  classified: number;
  failed: number;
};

export function describeClassificationRun(summary: ClassificationRunSummary): string {
  if (summary.candidatesFound === 0) return "Classification: nothing pending.";
  return `Classification: ${summary.classified} classified, ${summary.failed} failed (of ${summary.candidatesFound} pending).`;
}

const DEFAULT_BATCH_LIMIT = 25;

/**
 * Classifies up to `limit` pending staged candidates (across every
 * network — this is not scoped to one sync run). Bounded per call so a
 * single invocation stays well within a server action's execution time;
 * safe to call again to work through a larger backlog.
 *
 * Never writes to products/offers — only ever updates the staging columns
 * on product_import_sources via ClassificationStore. Publishing a
 * classified candidate is a human decision in a later phase's review UI.
 */
export async function classifyPendingProducts(
  store: ClassificationStore,
  client: ClassificationClient,
  options: { limit?: number } = {}
): Promise<ClassificationRunSummary> {
  const taxonomy = await store.loadTaxonomy();
  const candidates = await store.findPendingCandidates(options.limit ?? DEFAULT_BATCH_LIMIT);

  let classified = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const result = await classifyOne(client, candidate.product, taxonomy);
    await store.updateClassificationResult(candidate.importSourceId, result);
    if (result.status === "classified") classified += 1;
    else failed += 1;
  }

  return { candidatesFound: candidates.length, classified, failed };
}
