import "server-only";

import type {
  AffiliateNetworkAdapter,
  ConnectionTestResult,
  FetchProductsParams,
  FetchProductsResult,
  NormalizedOffer,
  NormalizedProduct,
} from "../../types";
import { getAdmitadConfig, hasAdmitadCredentials, type AdmitadConfig } from "./config";
import { withRetry, errorForResponse, fetchWithTimeout } from "../../httpRetry";
import { parseCsvFeed, normalizeFeedRow } from "./feedParser";
import { parseDiscoveredPrograms, type DiscoveredProgram } from "./discovery";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_PAGE_SIZE = 100;

export type AdmitadAdapterOptions = {
  config?: AdmitadConfig;
  /** Injectable so tests never hit a real network. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Admitad network adapter — ONE shared account-level connection
 * (OAuth token from ADMITAD_CLIENT_ID/SECRET or ADMITAD_ACCESS_TOKEN),
 * used to read MANY per-program feeds. There is no single "the" Admitad
 * feed URL any more: fetchProducts()/fetchOffers() take a `feedUrl` per
 * call (see FetchProductsParams), sourced from an admitad_programs row
 * (programsStore.ts) — never from an env var. A program with no feed_url
 * configured simply has nothing to sync yet.
 */
export class AdmitadAdapter implements AffiliateNetworkAdapter {
  readonly key = "admitad";
  readonly label = "Admitad";

  private readonly config: AdmitadConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  private accessToken: string | null;
  private readonly feedProductsCache = new Map<string, NormalizedProduct[]>();

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
    if (!hasAdmitadCredentials(this.config)) {
      return {
        ok: false,
        message: "Admitad is not configured: set ADMITAD_ACCESS_TOKEN or ADMITAD_CLIENT_ID/ADMITAD_CLIENT_SECRET.",
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
    if (!params.feedUrl) {
      throw new Error("No feed URL was provided for this Admitad program — check its admitad_programs row.");
    }
    const products = await this.loadFeedProducts(params.feedUrl);
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

  /** Unused by the current pipeline (offers come back inline with each product from fetchProducts) — searches whatever feeds are already cached in this instance rather than requiring a feedUrl the interface doesn't have a slot for. */
  async fetchOffers(externalProductId: string): Promise<NormalizedOffer[]> {
    for (const products of this.feedProductsCache.values()) {
      const match = products.find((p) => p.externalProductId === externalProductId);
      if (match) return match.offers;
    }
    return [];
  }

  normalize(raw: unknown): NormalizedProduct {
    return normalizeFeedRow(raw as Record<string, string>);
  }

  /**
   * ADMITAD ENDPOINT — UNVERIFIED. This sandbox has no network access to
   * admitad.com, so this "list advertiser programs" call (path, response
   * shape) is a best-effort reconstruction based on the advcampaigns_for_website
   * OAuth scope this adapter already requests, not something confirmed
   * against a live call or Admitad's current API docs. Parsing is
   * deliberately defensive (parseDiscoveredPrograms tolerates missing/
   * differently-named fields and never throws) so a wrong assumption here
   * degrades to "found nothing" rather than corrupting admitad_programs —
   * the manual "add a program by hand" path in the admin UI covers you
   * completely if this needs correcting once tested against a real account.
   */
  async discoverPrograms(): Promise<DiscoveredProgram[]> {
    const token = await this.ensureAccessToken();
    const url = `${this.config.apiBaseUrl}/advcampaigns/?limit=200`;

    const data = await withRetry(async () => {
      const response = await fetchWithTimeout(
        this.fetchImpl,
        url,
        { method: "GET", headers: { Authorization: `Bearer ${token}` } },
        this.timeoutMs
      );
      if (!response.ok) throw errorForResponse(response);
      return response.json();
    });

    return parseDiscoveredPrograms(data);
  }

  /**
   * ADMITAD ENDPOINT — UNVERIFIED, same caveat as discoverPrograms() above.
   * Admitad's OAuth2 token endpoint is documented (in general OAuth2
   * client_credentials fashion) to authenticate the client via HTTP Basic
   * auth — `Authorization: Basic base64(client_id:client_secret)` — rather
   * than by including client_id/client_secret in the request body. Real
   * evidence for this: a previous attempt to configure this app had the
   * account owner base64-encoding "client_id:client_secret" by hand into
   * what was then the single ADMITAD_PRODUCT_FEED_URL env var, matching
   * exactly what Admitad's own dashboard instructs publishers to compute
   * for this header — strongly suggesting Basic auth is what their token
   * endpoint actually expects. This method now generates that header
   * server-side from the account credentials on every call, so nobody
   * ever has to hand-compute or store a base64 string again.
   */
  private async requestAccessToken(): Promise<string> {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error("Admitad client id/secret are not configured, and no access token was provided.");
    }

    const url = `${this.config.apiBaseUrl}/token/`;
    const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`, "utf-8").toString("base64");
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "advcampaigns_for_website public_data",
    });

    const data = await withRetry(async () => {
      const response = await fetchWithTimeout(
        this.fetchImpl,
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${basicAuth}`,
          },
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

  private async loadFeedProducts(feedUrl: string): Promise<NormalizedProduct[]> {
    const cached = this.feedProductsCache.get(feedUrl);
    if (cached) return cached;

    const csvText = await withRetry(async () => {
      const response = await fetchWithTimeout(this.fetchImpl, feedUrl, { method: "GET" }, this.timeoutMs);
      if (!response.ok) throw errorForResponse(response);
      return response.text();
    });

    const rows = parseCsvFeed(csvText);
    const products = rows.map(normalizeFeedRow);
    this.feedProductsCache.set(feedUrl, products);
    return products;
  }
}
