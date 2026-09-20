import "server-only";

import type {
  AffiliateNetworkAdapter,
  ConnectionTestResult,
  FetchProductsParams,
  FetchProductsResult,
  NormalizedOffer,
  NormalizedProduct,
} from "../../types";
import { getAdmitadConfig, hasAdmitadCredentials, isAdmitadFullyConfigured, type AdmitadConfig } from "./config";
import { withRetry, errorForResponse, fetchWithTimeout } from "../../httpRetry";
import { parseCsvFeed, normalizeFeedRow } from "./feedParser";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_PAGE_SIZE = 100;

export type AdmitadAdapterOptions = {
  config?: AdmitadConfig;
  /** Injectable so tests never hit a real network. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Admitad network adapter. Product data always comes from the publisher's
 * own Product Feed URL (ADMITAD_PRODUCT_FEED_URL) — a CSV export the
 * publisher's Admitad account generates, not an endpoint this app guesses.
 * The OAuth token exchange (used only by connect()/testConnection(), never
 * for product data) hits an endpoint that could not be verified against
 * live Admitad docs in this sandbox — see requestAccessToken() below.
 */
export class AdmitadAdapter implements AffiliateNetworkAdapter {
  readonly key = "admitad";
  readonly label = "Admitad";

  private readonly config: AdmitadConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  private accessToken: string | null;
  private feedProductsCache: NormalizedProduct[] | null = null;

  constructor(options: AdmitadAdapterOptions = {}) {
    this.config = options.config ?? getAdmitadConfig();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.accessToken = this.config.accessToken;
  }

  async connect(): Promise<void> {
    await this.ensureAccessToken();
  }

  async testConnection(): Promise<ConnectionTestResult> {
    if (!isAdmitadFullyConfigured(this.config)) {
      return {
        ok: false,
        message: "Admitad is not fully configured (missing credentials or a product feed URL).",
      };
    }
    try {
      await this.ensureAccessToken();
      return { ok: true, message: "Connected to Admitad." };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error connecting to Admitad.";
      return { ok: false, message };
    }
  }

  async fetchProducts(params: FetchProductsParams): Promise<FetchProductsResult> {
    const products = await this.loadFeedProducts();
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const offset = params.cursor ? Number(params.cursor) : 0;

    const page = products.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    const hasMore = nextOffset < products.length;

    return {
      products: page,
      hasMore,
      nextCursor: hasMore ? String(nextOffset) : null,
    };
  }

  async fetchOffers(externalProductId: string): Promise<NormalizedOffer[]> {
    const products = await this.loadFeedProducts();
    return products.find((p) => p.externalProductId === externalProductId)?.offers ?? [];
  }

  normalize(raw: unknown): NormalizedProduct {
    return normalizeFeedRow(raw as Record<string, string>);
  }

  /**
   * ADMITAD ENDPOINT — UNVERIFIED. This sandbox has no network access to
   * admitad.com, so this OAuth token request (path, param names, scope
   * value) is a best-effort reconstruction of the standard OAuth2
   * client_credentials flow Admitad's docs describe, not something
   * confirmed against a live call. It only affects connect()/
   * testConnection() — fetchProducts()/fetchOffers() never call this and
   * always work off ADMITAD_PRODUCT_FEED_URL. Override ADMITAD_API_BASE_URL
   * if this host/path turns out to be wrong.
   */
  private async requestAccessToken(): Promise<string> {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error("Admitad client id/secret are not configured, and no access token was provided.");
    }

    const url = `${this.config.apiBaseUrl}/token/`;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: "advcampaigns_for_website public_data",
    });

    const data = await withRetry(async () => {
      const response = await fetchWithTimeout(
        this.fetchImpl,
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        },
        this.timeoutMs
      );
      if (!response.ok) throw errorForResponse(response);
      return (await response.json()) as { access_token?: string };
    });

    if (!data.access_token) {
      throw new Error("Admitad token response did not include an access_token.");
    }
    return data.access_token;
  }

  private async ensureAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;
    if (!hasAdmitadCredentials(this.config)) {
      throw new Error("Admitad is not configured: set ADMITAD_ACCESS_TOKEN or ADMITAD_CLIENT_ID/ADMITAD_CLIENT_SECRET.");
    }
    this.accessToken = await this.requestAccessToken();
    return this.accessToken;
  }

  private async loadFeedProducts(): Promise<NormalizedProduct[]> {
    if (this.feedProductsCache) return this.feedProductsCache;

    const feedUrl = this.config.productFeedUrl;
    if (!feedUrl) {
      throw new Error("ADMITAD_PRODUCT_FEED_URL is not configured.");
    }

    const csvText = await withRetry(async () => {
      const response = await fetchWithTimeout(this.fetchImpl, feedUrl, { method: "GET" }, this.timeoutMs);
      if (!response.ok) throw errorForResponse(response);
      return response.text();
    });

    const rows = parseCsvFeed(csvText);
    this.feedProductsCache = rows.map(normalizeFeedRow);
    return this.feedProductsCache;
  }
}
