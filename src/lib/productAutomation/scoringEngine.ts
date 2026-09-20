import type { SyncStore, DedupResult } from "./syncStore";
import type { NormalizedProduct } from "./types";
import { computeQualityScore } from "./scoring/qualityScore";
import { computeOpportunitySignal } from "./scoring/opportunitySignal";

/**
 * Runs right after dedup, using its result directly (no extra read).
 * Quality score is pure/local — no I/O. The opportunity signal needs one
 * conditional query: only when dedup found a real matching published
 * product does it fetch that product's actual current offers to compare
 * against; otherwise it's "insufficient_data" without touching the
 * database at all.
 *
 * Only ever writes the staging columns via ScoringResult — never touches
 * products/offers, never publishes anything.
 */
export async function scoreImportedProduct(
  store: SyncStore,
  importSourceId: string,
  product: NormalizedProduct,
  dedupResult: DedupResult
): Promise<void> {
  const { score: qualityScore, factors: qualityFactors } = computeQualityScore(product, dedupResult.status);

  const matchedProductId = dedupResult.status === "needs_review" ? dedupResult.matchProductId : null;
  const matchedProductOffers = matchedProductId ? await store.findOffersForProduct(matchedProductId) : null;

  const primaryOffer = product.offers[0];
  const opportunitySignal = computeOpportunitySignal({
    candidatePrice: primaryOffer?.price ?? null,
    candidateCurrency: primaryOffer?.currency ?? null,
    matchedProductOffers,
  });

  await store.updateScoringResult(importSourceId, { qualityScore, qualityFactors, opportunitySignal });
}
