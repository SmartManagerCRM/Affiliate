import type { NormalizedProduct } from "../types";
import type { DedupStatus, QualityScoreFactors } from "../syncStore";

/**
 * A deterministic data-completeness score (0-100), computed entirely from
 * the candidate's own normalized fields and its dedup outcome — no
 * external calls, no click/conversion data (none exists for an
 * unpublished candidate), nothing fabricated. This is "how curatable is
 * this candidate's data", not a prediction of how well it will sell —
 * that would require real performance data, which is Phase 9's job once
 * something is actually published.
 */

const MIN_DESCRIPTION_LENGTH = 40;

export const QUALITY_SCORE_WEIGHTS = {
  image: 20,
  description: 20,
  brand: 15,
  identifier: 15,
  dedupClean: 30,
} as const;

export type QualityScoreResult = {
  score: number;
  factors: QualityScoreFactors;
};

export function computeQualityScore(product: NormalizedProduct, dedupStatus: DedupStatus): QualityScoreResult {
  const factors: QualityScoreFactors = {
    hasImage: product.images.length > 0,
    hasDescription: Boolean(product.description?.trim() && product.description.trim().length >= MIN_DESCRIPTION_LENGTH),
    hasBrand: Boolean(product.brand?.trim()),
    hasIdentifier: Boolean(product.gtin?.trim() || product.sku?.trim()),
    isDedupClean: dedupStatus === "unique",
  };

  let score = 0;
  if (factors.hasImage) score += QUALITY_SCORE_WEIGHTS.image;
  if (factors.hasDescription) score += QUALITY_SCORE_WEIGHTS.description;
  if (factors.hasBrand) score += QUALITY_SCORE_WEIGHTS.brand;
  if (factors.hasIdentifier) score += QUALITY_SCORE_WEIGHTS.identifier;
  if (factors.isDedupClean) score += QUALITY_SCORE_WEIGHTS.dedupClean;

  return { score, factors };
}
