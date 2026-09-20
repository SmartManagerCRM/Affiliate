import type {
  AffiliateNetworkAdapter,
  ConnectionTestResult,
  FetchProductsParams,
  FetchProductsResult,
  NormalizedOffer,
  NormalizedProduct,
} from "../types";

/** Fully valid — has price, currency, affiliate URL, and an image. */
const VALID_PRODUCT: NormalizedProduct = {
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
};

/** Valid but has no image — proves missing images are accepted, not rejected. */
const VALID_PRODUCT_NO_IMAGE: NormalizedProduct = {
  externalProductId: "mock-2",
  name: "Mock Coffee Grinder",
  brand: "MockBrand",
  sku: "MOCK-GRIND-2",
  description: "A second fixture product used only by automated tests.",
  shortDescription: "Fixture product for tests.",
  images: [],
  raw: { id: "mock-2" },
  offers: [
    {
      externalOfferId: "mock-2-offer-1",
      price: 89.5,
      currency: "USD",
      availability: "in_stock",
      affiliateUrl: "https://example.test/go/mock-2",
      retailerName: "Mock Retailer",
    },
  ],
};

/** Invalid — no offers at all, so nothing to price or link to. */
const INVALID_PRODUCT_NO_OFFERS: NormalizedProduct = {
  externalProductId: "mock-3",
  name: "Mock Product Missing Offers",
  images: [],
  raw: { id: "mock-3" },
  offers: [],
};

/** Invalid — has an offer, but it's missing a price. */
const INVALID_PRODUCT_NO_PRICE: NormalizedProduct = {
  externalProductId: "mock-4",
  name: "Mock Product Missing Price",
  images: [],
  raw: { id: "mock-4" },
  offers: [
    {
      externalOfferId: "mock-4-offer-1",
      price: 0,
      currency: "USD",
      availability: "in_stock",
      affiliateUrl: "https://example.test/go/mock-4",
      retailerName: "Mock Retailer",
    },
  ],
};

/** Invalid — has a price, but no affiliate URL. */
const INVALID_PRODUCT_NO_AFFILIATE_URL: NormalizedProduct = {
  externalProductId: "mock-5",
  name: "Mock Product Missing Affiliate URL",
  images: [],
  raw: { id: "mock-5" },
  offers: [
    {
      externalOfferId: "mock-5-offer-1",
      price: 12.0,
      currency: "USD",
      availability: "in_stock",
      affiliateUrl: "",
      retailerName: "Mock Retailer",
    },
  ],
};

const ALL_FIXTURES = [
  VALID_PRODUCT,
  VALID_PRODUCT_NO_IMAGE,
  INVALID_PRODUCT_NO_OFFERS,
  INVALID_PRODUCT_NO_PRICE,
  INVALID_PRODUCT_NO_AFFILIATE_URL,
];

export type MockAdapterOptions = {
  /** Every call throws — simulates an API failure / timeout / network error. */
  shouldFail?: boolean;
  /** Custom fixture set. Defaults to ALL_FIXTURES (2 valid, 3 invalid). */
  products?: NormalizedProduct[];
  /** Products per page, to exercise pagination. Defaults to returning everything in one page. */
  pageSize?: number;
};

/**
 * Test-only adapter — never wired into production network status or sync
 * actions. Exists purely so the sync engine, and the import/validation
 * logic, can be exercised with deterministic fixture data instead of a
 * live affiliate API.
 */
export class MockAdapter implements AffiliateNetworkAdapter {
  readonly key = "mock";
  readonly label = "Mock Network (test only)";

  private readonly products: NormalizedProduct[];
  private readonly pageSize: number;

  constructor(private readonly options: MockAdapterOptions = {}) {
    this.products = options.products ?? ALL_FIXTURES;
    this.pageSize = options.pageSize ?? this.products.length;
  }

  async connect(): Promise<void> {
    if (this.options.shouldFail) throw new Error("Mock connect failure");
  }

  async testConnection(): Promise<ConnectionTestResult> {
    if (this.options.shouldFail) return { ok: false, message: "Mock connection failure" };
    return { ok: true, message: "Connected" };
  }

  async fetchProducts(params: FetchProductsParams): Promise<FetchProductsResult> {
    if (this.options.shouldFail) throw new Error("Mock fetch failure");

    const offset = params.cursor ? Number(params.cursor) : 0;
    const page = this.products.slice(offset, offset + this.pageSize);
    const nextOffset = offset + page.length;
    const hasMore = nextOffset < this.products.length;

    return {
      products: page,
      hasMore,
      nextCursor: hasMore ? String(nextOffset) : null,
    };
  }

  async fetchOffers(externalProductId: string): Promise<NormalizedOffer[]> {
    if (this.options.shouldFail) throw new Error("Mock fetch failure");
    return this.products.find((p) => p.externalProductId === externalProductId)?.offers ?? [];
  }

  normalize(raw: unknown): NormalizedProduct {
    const match = this.products.find((p) => p.externalProductId === (raw as { id?: string })?.id);
    if (!match) throw new Error("Unknown fixture id");
    return match;
  }
}
