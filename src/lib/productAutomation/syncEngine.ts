import type { AffiliateNetworkAdapter } from "./types";
import type { SyncStore } from "./syncStore";
import { validateNormalizedProduct } from "./validation";
import { extractIdentitySignals } from "./dedup";
import { deduplicateImportedProduct, loadPublishedProductCandidates } from "./dedupEngine";
import { scoreImportedProduct } from "./scoringEngine";

export type SyncRunOutcome = {
  runId: string;
  status: "completed" | "failed";
  productsFound: number;
  productsImported: number;
  productsUpdated: number;
  productsRejected: number;
  errorMessage: string | null;
};

const MAX_PAGES = 500; // safety bound against a misbehaving adapter looping forever

/**
 * Runs one synchronization attempt for a single network/adapter pair and
 * records the result. This is the one code path both the manual "Sync All"
 * action and the future scheduler (Phase 8) call — there is no separate,
 * less-safe path for manual syncs.
 *
 * For each page of products the adapter returns:
 *   1. validate it (has a price, currency, affiliate URL, etc.)
 *   2. if invalid: log a product_import_errors row, count it rejected
 *   3. if valid: normalize its identity signals (gtin/sku/brand/model/name)
 *      and upsert a product_import_sources row — new external id ->
 *      "imported", already-seen external id -> "updated"
 *   4. deduplicate: compare its identity against other staged candidates
 *      and already-published products; a confident match sets
 *      dedup_status = "needs_review" for a human to resolve later — never
 *      an automatic merge
 *   5. score: a deterministic 0-100 data-completeness score, plus an
 *      opportunity signal that is a real price comparison against a
 *      dedup-matched product's actual offers (or "insufficient_data" when
 *      there's no real basis to compare) — never a fabricated conversion
 *      rate or performance estimate
 *
 * This only ever stages pending import rows — it never writes to the real
 * products/offers tables. That happens later, once a human (or, after
 * Phase 4/5, an auto-publish rule) approves a candidate in the review queue.
 */
export async function runNetworkSync(
  store: SyncStore,
  networkId: string,
  adapter: AffiliateNetworkAdapter
): Promise<SyncRunOutcome> {
  const run = await store.createRun(networkId);

  let productsFound = 0;
  let productsImported = 0;
  let productsUpdated = 0;
  let productsRejected = 0;

  try {
    const publishedProductCandidates = await loadPublishedProductCandidates(store);

    let cursor: string | null | undefined = undefined;
    let hasMore = true;
    let pages = 0;

    while (hasMore) {
      if (++pages > MAX_PAGES) {
        throw new Error(`Exceeded maximum page count (${MAX_PAGES}) — the adapter's cursor may be stuck.`);
      }

      const page = await adapter.fetchProducts({ cursor });
      productsFound += page.products.length;

      for (const product of page.products) {
        const validation = validateNormalizedProduct(product);

        if (!validation.valid) {
          productsRejected += 1;
          await store.logError({
            syncRunId: run.id,
            networkId,
            externalId: product.externalProductId || null,
            errorType: validation.errorType,
            errorMessage: validation.errorMessage,
            rawData: product.raw,
          });
          continue;
        }

        const identity = extractIdentitySignals(product);

        const { outcome, importSourceId } = await store.upsertImportSource({
          networkId,
          externalProductId: product.externalProductId,
          externalOfferId: product.offers[0]?.externalOfferId ?? null,
          rawData: product.raw,
          normalizedData: product,
          normalizedName: identity.normalizedName,
          gtin: identity.gtin,
          sku: identity.sku,
          brand: identity.brand,
        });

        if (outcome === "inserted") productsImported += 1;
        else productsUpdated += 1;

        const dedupResult = await deduplicateImportedProduct(store, importSourceId, identity, publishedProductCandidates);
        await scoreImportedProduct(store, importSourceId, product, dedupResult);
      }

      hasMore = page.hasMore;
      cursor = page.nextCursor ?? null;
    }

    await store.completeRun(run.id, {
      productsFound,
      productsImported,
      productsUpdated,
      productsRejected,
    });

    return {
      runId: run.id,
      status: "completed",
      productsFound,
      productsImported,
      productsUpdated,
      productsRejected,
      errorMessage: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown synchronization error";

    await store.failRun(run.id, message);
    await store.logError({
      syncRunId: run.id,
      networkId,
      errorType: "sync_failure",
      errorMessage: message,
    });

    return {
      runId: run.id,
      status: "failed",
      productsFound,
      productsImported,
      productsUpdated,
      productsRejected,
      errorMessage: message,
    };
  }
}
