import type { SyncStore, DedupCandidate, DedupResult } from "./syncStore";
import type { IdentitySignals, MatchCandidate } from "./dedup";
import { pickBestMatch, MIN_REVIEW_CONFIDENCE } from "./dedup";

/** Fetches and wraps the published-product candidate pool once per sync run. */
export async function loadPublishedProductCandidates(store: SyncStore): Promise<MatchCandidate<DedupCandidate>[]> {
  const products = await store.findPublishedProductsForDedup();
  return products.map((c) => ({ ref: c, signals: c.signals }));
}

/**
 * Runs after a candidate has been normalized and staged. Compares it
 * against other staged import candidates (any network) and already-
 * published products, using an indexed exact-signal pre-filter (gtin/sku/
 * normalized-name) to keep the candidate pool small, then re-scores every
 * signal (including ones like `model` that have no dedicated DB column) in
 * memory from each candidate's full identity snapshot.
 *
 * Deliberately does not do fuzzy/typo-tolerant name matching — only exact
 * signal equality ever produces a score (see dedup.ts). This keeps false
 * positives near zero, at the cost of missing near-duplicates with slightly
 * different names; a documented scope limit for this phase, not a bug.
 *
 * Never writes to products/offers and never changes import_status — it only
 * ever sets dedup_status to "unique" or "needs_review" on the row itself
 * (and, when the match is against another import candidate, on that
 * candidate too — see below). Resolving a "needs_review" match (merge,
 * ignore, or treat as distinct) is a human decision made in a later
 * phase's review UI.
 *
 * Returns the result it wrote for THIS candidate (not the paired row, when
 * one was also updated) so the caller can feed it straight into scoring
 * without a redundant read.
 */
export async function deduplicateImportedProduct(
  store: SyncStore,
  importSourceId: string,
  identity: IdentitySignals,
  /** Published-product candidates, fetched once per sync run by the caller
   * (not once per product) — the published catalog doesn't change mid-run. */
  publishedProductCandidates: MatchCandidate<DedupCandidate>[]
): Promise<DedupResult> {
  const importCandidates = await store.findDedupCandidateImportSources({
    excludeImportSourceId: importSourceId,
    gtin: identity.gtin,
    sku: identity.sku,
    normalizedName: identity.normalizedName,
  });

  const candidates: MatchCandidate<DedupCandidate>[] = [
    ...importCandidates.map((c) => ({ ref: c, signals: c.signals })),
    ...publishedProductCandidates,
  ];

  const best = pickBestMatch(identity, candidates);

  if (best && best.confidence >= MIN_REVIEW_CONFIDENCE) {
    const result: DedupResult = {
      status: "needs_review",
      confidence: best.confidence,
      signals: best.signals,
      matchImportSourceId: best.ref.kind === "importSource" ? best.ref.id : null,
      matchProductId: best.ref.kind === "product" ? best.ref.id : null,
    };
    await store.updateDedupResult(importSourceId, result);

    // The matched row was scored and staged earlier in this same run (or an
    // earlier run), before this candidate existed to be compared against —
    // without this, only the later-seen half of a pair would ever show up
    // in a "needs_review" filter, and a reviewer could approve the other
    // half never knowing it had a duplicate.
    if (best.ref.kind === "importSource") {
      await store.updateDedupResult(best.ref.id, {
        status: "needs_review",
        confidence: best.confidence,
        signals: best.signals,
        matchImportSourceId: importSourceId,
        matchProductId: null,
      });
    }

    return result;
  }

  const result: DedupResult = { status: "unique" };
  await store.updateDedupResult(importSourceId, result);
  return result;
}
