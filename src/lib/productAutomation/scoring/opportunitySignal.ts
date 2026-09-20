import type { OpportunitySignal, ProductOffer } from "../syncStore";

/**
 * Computes a real price comparison against an already-published product's
 * actual current offers — the only thing dedup could have matched this
 * candidate against with any confidence. Never estimates a conversion
 * rate, EPC, or any other performance metric: no affiliate_clicks exist
 * yet for something that isn't published, so there is nothing real to
 * derive that from. Every branch here either returns a percentage computed
 * from two real prices already in the database, or explicitly says why it
 * couldn't (insufficient_data + reason) — never a manufactured number.
 */
export function computeOpportunitySignal(params: {
  candidatePrice: number | null;
  candidateCurrency: string | null;
  /** Offers for the product dedup matched this candidate against, or null if there was no match. */
  matchedProductOffers: ProductOffer[] | null;
}): OpportunitySignal {
  if (!params.matchedProductOffers || params.matchedProductOffers.length === 0) {
    return { status: "insufficient_data", reason: "No matching existing product to compare price against." };
  }

  if (params.candidatePrice == null || !Number.isFinite(params.candidatePrice) || !params.candidateCurrency) {
    return { status: "insufficient_data", reason: "Candidate has no valid price to compare." };
  }

  // Comparing across currencies without a real, current FX rate would mean
  // fabricating the comparison — only compare like-for-like.
  const sameCurrencyOffers = params.matchedProductOffers.filter((o) => o.currency === params.candidateCurrency);
  if (sameCurrencyOffers.length === 0) {
    return { status: "insufficient_data", reason: "No existing offer in a matching currency to compare against." };
  }

  const existingPrice = Math.min(...sameCurrencyOffers.map((o) => o.price));
  const candidatePrice = params.candidatePrice;

  if (candidatePrice < existingPrice) {
    const percentBelowExisting = Math.round(((existingPrice - candidatePrice) / existingPrice) * 1000) / 10;
    return { status: "cheaper", percentBelowExisting, existingPrice, candidatePrice, currency: params.candidateCurrency };
  }

  return { status: "not_cheaper", existingPrice, candidatePrice, currency: params.candidateCurrency };
}
