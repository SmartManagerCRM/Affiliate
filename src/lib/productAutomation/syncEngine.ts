import type { AffiliateNetworkAdapter } from "./types";
import type { SyncStore } from "./syncStore";

export type SyncRunOutcome = {
  runId: string;
  status: "completed" | "failed";
  productsFound: number;
  errorMessage: string | null;
};

/**
 * Runs one synchronization attempt for a single network/adapter pair and
 * records the result. This is the one code path both the manual "Sync All"
 * action and the future scheduler (Phase 8) call — there is no separate,
 * less-safe path for manual syncs.
 *
 * Phase 1 only fetches and counts products; importing/normalizing/
 * deduplicating them into the catalog is Phase 2+.
 */
export async function runNetworkSync(
  store: SyncStore,
  networkId: string,
  adapter: AffiliateNetworkAdapter
): Promise<SyncRunOutcome> {
  const run = await store.createRun(networkId);

  try {
    const result = await adapter.fetchProducts({});

    await store.completeRun(run.id, { productsFound: result.products.length });

    return {
      runId: run.id,
      status: "completed",
      productsFound: result.products.length,
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
      productsFound: 0,
      errorMessage: message,
    };
  }
}
