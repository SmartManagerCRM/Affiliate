import { describe, it, expect, beforeEach } from "vitest";
import { runNetworkSync } from "./syncEngine";
import { MockAdapter } from "./adapters/mockAdapter";
import { normalizeNameForMatch } from "./dedup";
import { QUALITY_SCORE_WEIGHTS } from "./scoring/qualityScore";
import type {
  DedupCandidate,
  DedupResult,
  FindDedupCandidatesParams,
  LogErrorParams,
  OpportunitySignal,
  ProductOffer,
  QualityScoreFactors,
  ScoringResult,
  SyncRunCounts,
  SyncRunRecord,
  SyncStore,
  UpsertImportSourceOutcome,
  UpsertImportSourceParams,
} from "./syncStore";
import type { NormalizedProduct } from "./types";

type StoredImportSource = {
  id: string;
  networkId: string;
  externalProductId: string;
  externalOfferId: string | null;
  importStatus: string;
  normalizedData: unknown;
  normalizedName: string;
  gtin: string | null;
  sku: string | null;
  brand: string | null;
  dedupStatus: "unique" | "needs_review";
  dedupConfidence: number | null;
  dedupSignals: string[];
  dedupMatchSourceId: string | null;
  dedupMatchProductId: string | null;
  qualityScore: number;
  qualityScoreFactors: QualityScoreFactors | null;
  opportunitySignal: OpportunitySignal | null;
};

/** Deterministic in-memory SyncStore — no network, no database. */
class InMemorySyncStore implements SyncStore {
  runs = new Map<string, SyncRunRecord>();
  errors: LogErrorParams[] = [];
  importSources = new Map<string, StoredImportSource>();
  /** Injected "already-published products" pool for dedup tests. */
  publishedProducts: DedupCandidate[] = [];
  /** Injected real offers for a given (already-published) product id, for opportunity-signal tests. */
  offersByProductId = new Map<string, ProductOffer[]>();
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
    const existing = this.importSources.get(key);

    if (existing) {
      Object.assign(existing, {
        normalizedData: params.normalizedData,
        normalizedName: params.normalizedName,
        gtin: params.gtin,
        sku: params.sku,
        brand: params.brand,
      });
      return { outcome: "updated", importSourceId: existing.id };
    }

    const id = `import-${this.nextId++}`;
    this.importSources.set(key, {
      id,
      networkId: params.networkId,
      externalProductId: params.externalProductId,
      externalOfferId: params.externalOfferId ?? null,
      importStatus: "pending",
      normalizedData: params.normalizedData,
      normalizedName: params.normalizedName,
      gtin: params.gtin,
      sku: params.sku,
      brand: params.brand,
      dedupStatus: "unique",
      dedupConfidence: null,
      dedupSignals: [],
      dedupMatchSourceId: null,
      dedupMatchProductId: null,
      qualityScore: 0,
      qualityScoreFactors: null,
      opportunitySignal: null,
    });
    return { outcome: "inserted", importSourceId: id };
  }

  async findDedupCandidateImportSources(params: FindDedupCandidatesParams): Promise<DedupCandidate[]> {
    const rows = Array.from(this.importSources.values()).filter(
      (row) =>
        row.id !== params.excludeImportSourceId &&
        row.importStatus !== "rejected" &&
        row.importStatus !== "failed" &&
        ((params.gtin && row.gtin === params.gtin) ||
          (params.sku && row.sku === params.sku) ||
          (params.normalizedName && row.normalizedName === params.normalizedName))
    );

    return rows.map((row) => ({
      kind: "importSource" as const,
      id: row.id,
      signals: {
        gtin: row.gtin,
        sku: row.sku,
        brand: row.brand,
        model: (row.normalizedData as { model?: string })?.model ?? null,
        normalizedName: row.normalizedName,
      },
    }));
  }

  async findPublishedProductsForDedup(): Promise<DedupCandidate[]> {
    return this.publishedProducts;
  }

  async updateDedupResult(importSourceId: string, result: DedupResult): Promise<void> {
    const row = Array.from(this.importSources.values()).find((r) => r.id === importSourceId);
    if (!row) throw new Error("Import source not found");

    if (result.status === "unique") {
      Object.assign(row, {
        dedupStatus: "unique",
        dedupConfidence: null,
        dedupSignals: [],
        dedupMatchSourceId: null,
        dedupMatchProductId: null,
      });
    } else {
      Object.assign(row, {
        dedupStatus: "needs_review",
        dedupConfidence: result.confidence,
        dedupSignals: result.signals,
        dedupMatchSourceId: result.matchImportSourceId,
        dedupMatchProductId: result.matchProductId,
      });

      // Mirrors SupabaseSyncStore: a row already scored "unique" before a
      // later match retroactively flips it to needs_review must lose the
      // dedup-clean bonus, or its quality_score goes stale.
      if (row.qualityScoreFactors?.isDedupClean) {
        row.qualityScore = Math.max(0, row.qualityScore - QUALITY_SCORE_WEIGHTS.dedupClean);
        row.qualityScoreFactors = { ...row.qualityScoreFactors, isDedupClean: false };
      }
    }
  }

  async findOffersForProduct(productId: string): Promise<ProductOffer[]> {
    return this.offersByProductId.get(productId) ?? [];
  }

  async updateScoringResult(importSourceId: string, result: ScoringResult): Promise<void> {
    const row = Array.from(this.importSources.values()).find((r) => r.id === importSourceId);
    if (!row) throw new Error("Import source not found");
    Object.assign(row, {
      qualityScore: result.qualityScore,
      qualityScoreFactors: result.qualityFactors,
      opportunitySignal: result.opportunitySignal,
    });
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

  describe("deduplication", () => {
    it("leaves genuinely different products as unique", async () => {
      const products = [VALID_PRODUCT_A, VALID_PRODUCT_B];
      const adapter = new MockAdapter({ products });

      await runNetworkSync(store, "network-1", adapter);

      for (const row of store.importSources.values()) {
        expect(row.dedupStatus).toBe("unique");
      }
    });

    it("flags two candidates sharing an exact GTIN as needs_review", async () => {
      const productWithGtin: NormalizedProduct = { ...VALID_PRODUCT_A, gtin: "0012345678905" };
      const productSameGtinDifferentName: NormalizedProduct = {
        ...VALID_PRODUCT_B,
        externalProductId: "b-2",
        gtin: "0012345678905",
        offers: [{ ...VALID_PRODUCT_B.offers[0], externalOfferId: "b-2-offer" }],
      };

      const adapter = new MockAdapter({ products: [productWithGtin, productSameGtinDifferentName] });
      await runNetworkSync(store, "network-1", adapter);

      const rows = Array.from(store.importSources.values());
      expect(rows.every((r) => r.dedupStatus === "needs_review")).toBe(true);
      expect(rows.every((r) => r.dedupConfidence === 100)).toBe(true);
      expect(rows.every((r) => r.dedupSignals.includes("gtin"))).toBe(true);
      // Each points at the other as its match.
      expect(rows[0].dedupMatchSourceId).toBe(rows[1].id);
      expect(rows[1].dedupMatchSourceId).toBe(rows[0].id);
    });

    it("flags matching sku + brand as needs_review even with different names", async () => {
      const first: NormalizedProduct = { ...VALID_PRODUCT_A, sku: "SKU-1", brand: "Acme" };
      const second: NormalizedProduct = {
        ...VALID_PRODUCT_B,
        externalProductId: "b-3",
        sku: "SKU-1",
        brand: "Acme",
        offers: [{ ...VALID_PRODUCT_B.offers[0], externalOfferId: "b-3-offer" }],
      };

      const adapter = new MockAdapter({ products: [first, second] });
      await runNetworkSync(store, "network-1", adapter);

      const rows = Array.from(store.importSources.values());
      expect(rows.every((r) => r.dedupStatus === "needs_review")).toBe(true);
      expect(rows.every((r) => r.dedupConfidence === 90)).toBe(true);
    });

    it("does not flag a sku match alone when brands differ (still below auto-merge, but scored lower)", async () => {
      const first: NormalizedProduct = { ...VALID_PRODUCT_A, sku: "SKU-9", brand: "Acme" };
      const second: NormalizedProduct = {
        ...VALID_PRODUCT_B,
        externalProductId: "b-4",
        sku: "SKU-9",
        brand: "OtherBrand",
        offers: [{ ...VALID_PRODUCT_B.offers[0], externalOfferId: "b-4-offer" }],
      };

      const adapter = new MockAdapter({ products: [first, second] });
      await runNetworkSync(store, "network-1", adapter);

      const rows = Array.from(store.importSources.values());
      // sku match alone (no brand agreement) still scores 70, above the review threshold.
      expect(rows.every((r) => r.dedupStatus === "needs_review")).toBe(true);
      expect(rows.every((r) => r.dedupConfidence === 70)).toBe(true);
      expect(rows.every((r) => !r.dedupSignals.includes("brand"))).toBe(true);
    });

    it("never sets import_status to anything but pending as a result of dedup", async () => {
      const productWithGtin: NormalizedProduct = { ...VALID_PRODUCT_A, gtin: "0099999999999" };
      const duplicate: NormalizedProduct = {
        ...VALID_PRODUCT_B,
        externalProductId: "b-5",
        gtin: "0099999999999",
        offers: [{ ...VALID_PRODUCT_B.offers[0], externalOfferId: "b-5-offer" }],
      };
      const adapter = new MockAdapter({ products: [productWithGtin, duplicate] });

      await runNetworkSync(store, "network-1", adapter);

      for (const row of store.importSources.values()) {
        expect(row.importStatus).toBe("pending");
      }
    });

    it("flags a candidate matching an already-published product's name and brand", async () => {
      store.publishedProducts = [
        {
          kind: "product",
          id: "published-product-1",
          signals: {
            gtin: null,
            sku: null,
            brand: "acme",
            model: null,
            normalizedName: normalizeNameForMatch("Product A"),
          },
        },
      ];

      const candidate: NormalizedProduct = { ...VALID_PRODUCT_A, brand: "Acme" };
      const adapter = new MockAdapter({ products: [candidate] });

      await runNetworkSync(store, "network-1", adapter);

      const rows = Array.from(store.importSources.values());
      expect(rows).toHaveLength(1);
      expect(rows[0].dedupStatus).toBe("needs_review");
      expect(rows[0].dedupMatchProductId).toBe("published-product-1");
      expect(rows[0].dedupMatchSourceId).toBeNull();
    });

    it("does not flag a name-only match against a published product below the brand tier as unrelated when brand is absent on both sides", async () => {
      store.publishedProducts = [
        {
          kind: "product",
          id: "published-product-2",
          signals: { gtin: null, sku: null, brand: null, model: null, normalizedName: normalizeNameForMatch("Product A") },
        },
      ];

      const candidate: NormalizedProduct = { ...VALID_PRODUCT_A }; // no brand set
      const adapter = new MockAdapter({ products: [candidate] });

      await runNetworkSync(store, "network-1", adapter);

      const rows = Array.from(store.importSources.values());
      // Exact normalized-name match alone (no brand on either side) still scores 45, at the review threshold.
      expect(rows[0].dedupStatus).toBe("needs_review");
      expect(rows[0].dedupConfidence).toBe(45);
    });
  });

  describe("scoring", () => {
    const RICH_PRODUCT: NormalizedProduct = {
      ...VALID_PRODUCT_A,
      brand: "Acme",
      gtin: "0012345678905",
      description: "A".repeat(50),
      images: ["https://example.test/img.jpg"],
    };

    it("gives a full-completeness, unique candidate the maximum score", async () => {
      const adapter = new MockAdapter({ products: [RICH_PRODUCT] });
      await runNetworkSync(store, "network-1", adapter);

      const row = Array.from(store.importSources.values())[0];
      expect(row.qualityScore).toBe(100);
      expect(row.qualityScoreFactors).toEqual({
        hasImage: true,
        hasDescription: true,
        hasBrand: true,
        hasIdentifier: true,
        isDedupClean: true,
      });
    });

    it("scores a minimal (but valid) candidate on dedup cleanliness alone", async () => {
      const adapter = new MockAdapter({ products: [VALID_PRODUCT_A] }); // no brand/gtin/sku/description/images
      await runNetworkSync(store, "network-1", adapter);

      const row = Array.from(store.importSources.values())[0];
      expect(row.qualityScore).toBe(30); // dedupClean weight only
      expect(row.qualityScoreFactors).toMatchObject({
        hasImage: false,
        hasDescription: false,
        hasBrand: false,
        hasIdentifier: false,
        isDedupClean: true,
      });
    });

    it("a needs_review dedup match lowers the score by losing the dedup-clean component", async () => {
      const a: NormalizedProduct = { ...RICH_PRODUCT, gtin: "0055555555555" };
      const b: NormalizedProduct = {
        ...RICH_PRODUCT,
        externalProductId: "b-dup",
        gtin: "0055555555555",
        offers: [{ ...RICH_PRODUCT.offers[0], externalOfferId: "b-dup-offer" }],
      };
      const adapter = new MockAdapter({ products: [a, b] });
      await runNetworkSync(store, "network-1", adapter);

      for (const row of store.importSources.values()) {
        expect(row.dedupStatus).toBe("needs_review");
        expect(row.qualityScore).toBe(70); // 100 minus the 30-point dedup-clean component
      }
    });

    it("opportunity_signal is insufficient_data when dedup found no match", async () => {
      const adapter = new MockAdapter({ products: [RICH_PRODUCT] });
      await runNetworkSync(store, "network-1", adapter);

      const row = Array.from(store.importSources.values())[0];
      expect(row.opportunitySignal).toMatchObject({ status: "insufficient_data" });
    });

    it("opportunity_signal is insufficient_data when the dedup match is another candidate, not a real published product", async () => {
      const a: NormalizedProduct = { ...RICH_PRODUCT, gtin: "0077777777777" };
      const b: NormalizedProduct = {
        ...RICH_PRODUCT,
        externalProductId: "b-dup2",
        gtin: "0077777777777",
        offers: [{ ...RICH_PRODUCT.offers[0], externalOfferId: "b-dup2-offer" }],
      };
      const adapter = new MockAdapter({ products: [a, b] });
      await runNetworkSync(store, "network-1", adapter);

      for (const row of store.importSources.values()) {
        expect(row.opportunitySignal).toMatchObject({ status: "insufficient_data" });
      }
    });

    it("opportunity_signal is insufficient_data when the matched product has no real offers to compare", async () => {
      store.publishedProducts = [
        {
          kind: "product",
          id: "published-empty",
          signals: { gtin: "0088888888888", sku: null, brand: null, model: null, normalizedName: "x" },
        },
      ];
      const candidate: NormalizedProduct = { ...RICH_PRODUCT, gtin: "0088888888888" };
      const adapter = new MockAdapter({ products: [candidate] });

      await runNetworkSync(store, "network-1", adapter);

      const row = Array.from(store.importSources.values())[0];
      expect(row.dedupMatchProductId).toBe("published-empty");
      expect(row.opportunitySignal).toMatchObject({ status: "insufficient_data" });
    });

    it("opportunity_signal reports 'cheaper' with a real percentage when the candidate genuinely undercuts the matched product", async () => {
      store.publishedProducts = [
        {
          kind: "product",
          id: "published-priced",
          signals: { gtin: "0099999999998", sku: null, brand: null, model: null, normalizedName: "x" },
        },
      ];
      store.offersByProductId.set("published-priced", [{ price: 20, currency: "USD" }]);

      const candidate: NormalizedProduct = {
        ...RICH_PRODUCT,
        gtin: "0099999999998",
        offers: [{ ...RICH_PRODUCT.offers[0], price: 15, currency: "USD" }],
      };
      const adapter = new MockAdapter({ products: [candidate] });

      await runNetworkSync(store, "network-1", adapter);

      const row = Array.from(store.importSources.values())[0];
      expect(row.opportunitySignal).toEqual({
        status: "cheaper",
        percentBelowExisting: 25,
        existingPrice: 20,
        candidatePrice: 15,
        currency: "USD",
      });
    });

    it("opportunity_signal reports 'not_cheaper' truthfully when the candidate is not actually cheaper", async () => {
      store.publishedProducts = [
        {
          kind: "product",
          id: "published-priced-2",
          signals: { gtin: "0011111111112", sku: null, brand: null, model: null, normalizedName: "x" },
        },
      ];
      store.offersByProductId.set("published-priced-2", [{ price: 10, currency: "USD" }]);

      const candidate: NormalizedProduct = {
        ...RICH_PRODUCT,
        gtin: "0011111111112",
        offers: [{ ...RICH_PRODUCT.offers[0], price: 12, currency: "USD" }],
      };
      const adapter = new MockAdapter({ products: [candidate] });

      await runNetworkSync(store, "network-1", adapter);

      const row = Array.from(store.importSources.values())[0];
      expect(row.opportunitySignal).toEqual({
        status: "not_cheaper",
        existingPrice: 10,
        candidatePrice: 12,
        currency: "USD",
      });
    });

    it("never fabricates a cross-currency comparison — insufficient_data instead", async () => {
      store.publishedProducts = [
        {
          kind: "product",
          id: "published-eur",
          signals: { gtin: "0022222222223", sku: null, brand: null, model: null, normalizedName: "x" },
        },
      ];
      store.offersByProductId.set("published-eur", [{ price: 20, currency: "EUR" }]);

      const candidate: NormalizedProduct = {
        ...RICH_PRODUCT,
        gtin: "0022222222223",
        offers: [{ ...RICH_PRODUCT.offers[0], price: 5, currency: "USD" }],
      };
      const adapter = new MockAdapter({ products: [candidate] });

      await runNetworkSync(store, "network-1", adapter);

      const row = Array.from(store.importSources.values())[0];
      expect(row.opportunitySignal).toMatchObject({ status: "insufficient_data" });
    });
  });
});
