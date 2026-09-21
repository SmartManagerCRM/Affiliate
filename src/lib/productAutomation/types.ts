/**
 * Shared contract every affiliate network integration implements. Phase 1
 * only defines this interface and a test-only mock — no network-specific
 * adapter (Admitad/CJ/ClickBank) exists yet. Each real adapter is added in
 * its own phase, behind this same interface, so the rest of the system
 * (sync engine, review queue, admin UI) never has network-specific logic.
 */

export type Availability = "in_stock" | "limited" | "out_of_stock" | "preorder";

export type NormalizedOffer = {
  externalOfferId: string;
  price: number;
  originalPrice?: number | null;
  currency: string;
  availability: Availability;
  affiliateUrl: string;
  retailerName: string;
  country?: string | null;
  shippingInfo?: string | null;
  commissionRate?: number | null;
};

export type NormalizedProduct = {
  externalProductId: string;
  name: string;
  brand?: string | null;
  sku?: string | null;
  gtin?: string | null;
  /** Model number/name, when the source distinguishes it from name/SKU — a dedup identity signal. */
  model?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  images: string[];
  offers: NormalizedOffer[];
  /** The untouched source payload this was normalized from, preserved for auditing/reprocessing. */
  raw: unknown;
};

export type FetchProductsParams = {
  cursor?: string | null;
  limit?: number;
  /** Which feed to read, for a network (like Admitad) whose products live behind many per-program feed URLs rather than one fixed endpoint. Adapters that only ever have one feed can ignore this. */
  feedUrl?: string;
  /** Which advertiser/program to read, for a network (like CJ) whose product API is queried per-advertiser rather than via a feed URL. Adapters that don't need this can ignore it. */
  advertiserId?: string;
};

export type FetchProductsResult = {
  products: NormalizedProduct[];
  hasMore: boolean;
  nextCursor?: string | null;
};

export type ConnectionTestResult = {
  ok: boolean;
  message: string;
};

export interface AffiliateNetworkAdapter {
  /** Machine key, e.g. "admitad" — must match a NETWORK_REGISTRY entry. */
  readonly key: string;
  readonly label: string;

  /** Establishes/refreshes whatever auth state the adapter needs (e.g. an OAuth token). */
  connect(): Promise<void>;

  /** Cheap round-trip to confirm credentials work, without pulling a full feed. */
  testConnection(): Promise<ConnectionTestResult>;

  /** Pulls a page of products (already normalized) from the network's feed/API. */
  fetchProducts(params: FetchProductsParams): Promise<FetchProductsResult>;

  /** Pulls current offers for one external product, where the network exposes that separately. */
  fetchOffers(externalProductId: string): Promise<NormalizedOffer[]>;

  /** Maps one raw source record into the normalized shape. Exposed for unit testing field mapping in isolation. */
  normalize(raw: unknown): NormalizedProduct;
}
