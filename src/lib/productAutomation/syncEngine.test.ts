import { describe, it, expect, beforeEach } from "vitest";
import { runNetworkSync } from "./syncEngine";
import { MockAdapter } from "./adapters/mockAdapter";
import type {
  LogErrorParams,
  SyncRunCounts,
  SyncRunRecord,
  SyncStore,
  UpsertImportSourceOutcome,
  UpsertImportSourceParams,
} from "./syncStore";
import type { NormalizedProduct } from "./types";

/** Deterministic in-memory SyncStore — no network, no database. */
class InMemorySyncStore implements SyncStore {
  runs = new Map<string, SyncRunRecord>();
  errors: LogErrorParams[] = [];
  importSources = new Map<string, unknown>();
  private nextId = 1;

  async createRun(networkId: string): Promise<SyncRunRecord> {
    const id = `run-${this.nextId++}`;
    const record: SyncRunRecord = {
      id,
      networkId,
      status: "running",
      startedAt: new Date().toISOString(),
      completedAt: null,
      productsFound: 0,
      productsImported: 0,
      productsUpdated: 0,
      productsRejected: 0,
      errorsCount: 0,
      errorMessage: null,
    };
    this.runs.set(id, record);
    return record;
  }

  async completeRun(runId: string, counts: SyncRunCounts): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) throw new Error("Run not found");
    Object.assign(run, {
      status: "completed",
      completedAt: new Date().toISOString(),
      ...(counts.productsFound !== undefined && { productsFound: counts.productsFound }),
      ...(counts.productsImported !== undefined && { productsImported: counts.productsImported }),
      ...(counts.productsUpdated !== undefined && { productsUpdated: counts.productsUpdated }),
      ...(counts.productsRejected !== undefined && { productsRejected: counts.productsRejected }),
    });
  }

  async failRun(runId: string, errorMessage: string, errorsCount = 1): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) throw new Error("Run not found");
    Object.assign(run, {
      status: "failed",
      completedAt: new Date().toISOString(),
      errorsCount,
      errorMessage,
    });
  }

  async logError(params: LogErrorParams): Promise<void> {
    this.errors.push(params);
  }

  async upsertImportSource(params: UpsertImportSourceParams): Promise<UpsertImportSourceOutcome> {
    const key = `${params.networkId}:${params.externalProductId}:${params.externalOfferId ?? ""}`;
    const outcome: UpsertImportSourceOutcome = this.importSources.has(key) ? "updated" : "inserted";
    this.importSources.set(key, params.rawData);
    return outcome;
  }
}

const VALID_PRODUCT_A: NormalizedProduct = {
  externalProductId: "a-1",
  name: "Product A",
  images: [],
  raw: { id: "a-1" },
  offers: [
    {
      externalOfferId: "a-1-offer",
      price: 10,
      currency: "USD",
      availability: "in_stock",
      affiliateUrl: "https://example.test/go/a-1",
      retailerName: "Retailer",
    },
  ],
};

const VALID_PRODUCT_B: NormalizedProduct = {
  externalProductId: "b-1",
  name: "Product B",
  images: [],
  raw: { id: "b-1" },
  offers: [
    {
      externalOfferId: "b-1-offer",
      price: 20,
      currency: "USD",
      availability: "in_stock",
      affiliateUrl: "https://example.test/go/b-1",
      retailerName: "Retailer",
    },
  ],
};

const INVALID_PRODUCT: NormalizedProduct = {
  externalProductId: "invalid-1",
  name: "Invalid Product",
  images: [],
  raw: { id: "invalid-1" },
  offers: [],
};

describe("runNetworkSync", () => {
  let store: InMemorySyncStore;

  beforeEach(() => {
    store = new InMemorySyncStore();
  });

  it("creates a sync run and marks it completed on success", async () => {
    const adapter = new MockAdapter();

    const outcome = await runNetworkSync(store, "network-1", adapter);

    expect(outcome.status).toBe("completed");
    expect(outcome.productsFound).toBe(5); // default fixture set has 5 products (2 valid, 3 invalid)
    expect(outcome.errorMessage).toBeNull();

    const stored = store.runs.get(outcome.runId);
    expect(stored?.status).toBe("completed");
    expect(stored?.productsFound).toBe(5);
    expect(stored?.completedAt).not.toBeNull();
  });

  it("imports valid products and rejects invalid ones, logging why", async () => {
    const adapter = new MockAdapter();

    const outcome = await runNetworkSync(store, "network-1", adapter);

    expect(outcome.productsImported).toBe(2);
    expect(outcome.productsUpdated).toBe(0);
    expect(outcome.productsRejected).toBe(3);
    expect(store.errors).toHaveLength(3);
    expect(store.errors.map((e) => e.errorType).sort()).toEqual([
      "missing_affiliate_url",
      "missing_offer",
      "missing_price",
    ]);
  });

  it("creates a sync run for the exact network id it was called with", async () => {
    const adapter = new MockAdapter();
    const outcome = await runNetworkSync(store, "network-xyz", adapter);
    expect(store.runs.get(outcome.runId)?.networkId).toBe("network-xyz");
  });

  it("marks the run failed and logs an error when the adapter throws", async () => {
    const adapter = new MockAdapter({ shouldFail: true });

    const outcome = await runNetworkSync(store, "network-1", adapter);

    expect(outcome.status).toBe("failed");
    expect(outcome.productsFound).toBe(0);
    expect(outcome.errorMessage).toBe("Mock fetch failure");

    const stored = store.runs.get(outcome.runId);
    expect(stored?.status).toBe("failed");
    expect(stored?.errorMessage).toBe("Mock fetch failure");
    expect(stored?.completedAt).not.toBeNull();

    expect(store.errors).toHaveLength(1);
    expect(store.errors[0]).toMatchObject({
      syncRunId: outcome.runId,
      networkId: "network-1",
      errorType: "sync_failure",
      errorMessage: "Mock fetch failure",
    });
  });

  it("never leaves a run stuck in 'running' after failure", async () => {
    const adapter = new MockAdapter({ shouldFail: true });
    const outcome = await runNetworkSync(store, "network-1", adapter);
    const stored = store.runs.get(outcome.runId);
    expect(stored?.status).not.toBe("running");
  });

  it("accumulates results correctly across multiple pages", async () => {
    const products = [VALID_PRODUCT_A, VALID_PRODUCT_B, INVALID_PRODUCT];
    const adapter = new MockAdapter({ products, pageSize: 1 }); // forces 3 pages

    const outcome = await runNetworkSync(store, "network-1", adapter);

    expect(outcome.status).toBe("completed");
    expect(outcome.productsFound).toBe(3);
    expect(outcome.productsImported).toBe(2);
    expect(outcome.productsRejected).toBe(1);
  });

  it("re-syncing the same external id updates rather than duplicates it", async () => {
    const adapter = new MockAdapter({ products: [VALID_PRODUCT_A] });

    const first = await runNetworkSync(store, "network-1", adapter);
    expect(first.productsImported).toBe(1);
    expect(first.productsUpdated).toBe(0);

    const second = await runNetworkSync(store, "network-1", adapter);
    expect(second.productsImported).toBe(0);
    expect(second.productsUpdated).toBe(1);

    expect(store.importSources.size).toBe(1);
  });

  it("a partial import (mix of valid and invalid) still completes the run", async () => {
    const products = [VALID_PRODUCT_A, INVALID_PRODUCT, VALID_PRODUCT_B];
    const adapter = new MockAdapter({ products });

    const outcome = await runNetworkSync(store, "network-1", adapter);

    expect(outcome.status).toBe("completed");
    expect(outcome.productsImported).toBe(2);
    expect(outcome.productsRejected).toBe(1);
    expect(store.errors).toHaveLength(1);
    expect(store.errors[0].externalId).toBe("invalid-1");
  });
});
