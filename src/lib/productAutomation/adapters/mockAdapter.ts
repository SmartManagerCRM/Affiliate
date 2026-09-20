import type {
  AffiliateNetworkAdapter,
  ConnectionTestResult,
  FetchProductsResult,
  NormalizedOffer,
  NormalizedProduct,
} from "../types";

const FIXTURE_PRODUCTS: NormalizedProduct[] = [
  {
    externalProductId: "mock-1",
    name: "Mock Espresso Machine",
    brand: "MockBrand",
    sku: "MOCK-ESP-1",
    description: "A fixture product used only by automated tests.",
    shortDescription: "Fixture product for tests.",
    images: ["https://example.test/mock-1.jpg"],
    raw: { id: "mock-1" },
    offers: [
      {
        externalOfferId: "mock-1-offer-1",
        price: 199.99,
        originalPrice: 249.99,
        currency: "USD",
        availability: "in_stock",
        affiliateUrl: "https://example.test/go/mock-1",
        retailerName: "Mock Retailer",
      },
    ],
  },
  {
    externalProductId: "mock-2",
    name: "Mock Coffee Grinder",
    brand: "MockBrand",
    sku: "MOCK-GRIND-2",
    description: "A second fixture product used only by automated tests.",
    shortDescription: "Fixture product for tests.",
    images: [],
    raw: { id: "mock-2" },
    offers: [],
  },
];

/**
 * Test-only adapter — never wired into production network status or sync
 * actions. Exists purely so the sync engine, and later phases' import/
 * normalization logic, can be exercised with deterministic fixture data
 * instead of a live affiliate API.
 */
export class MockAdapter implements AffiliateNetworkAdapter {
  readonly key = "mock";
  readonly label = "Mock Network (test only)";

  constructor(private readonly options: { shouldFail?: boolean } = {}) {}

  async connect(): Promise<void> {
    if (this.options.shouldFail) throw new Error("Mock connect failure");
  }

  async testConnection(): Promise<ConnectionTestResult> {
    if (this.options.shouldFail) return { ok: false, message: "Mock connection failure" };
    return { ok: true, message: "Connected" };
  }

  async fetchProducts(): Promise<FetchProductsResult> {
    if (this.options.shouldFail) throw new Error("Mock fetch failure");
    return { products: FIXTURE_PRODUCTS, hasMore: false };
  }

  async fetchOffers(externalProductId: string): Promise<NormalizedOffer[]> {
    if (this.options.shouldFail) throw new Error("Mock fetch failure");
    return FIXTURE_PRODUCTS.find((p) => p.externalProductId === externalProductId)?.offers ?? [];
  }

  normalize(raw: unknown): NormalizedProduct {
    const match = FIXTURE_PRODUCTS.find((p) => p.externalProductId === (raw as { id?: string })?.id);
    if (!match) throw new Error("Unknown fixture id");
    return match;
  }
}
