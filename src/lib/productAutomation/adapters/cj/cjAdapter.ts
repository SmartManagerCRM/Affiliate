import "server-only";

import type {
  AffiliateNetworkAdapter,
  ConnectionTestResult,
  FetchProductsParams,
  FetchProductsResult,
  NormalizedOffer,
  NormalizedProduct,
} from "../../types";
import { getCjConfig, hasCjCredentials, type CjConfig } from "./config";
import { withRetry, errorForResponse, fetchWithTimeout } from "../../httpRetry";
import { parseAdvertiserLookupResponse, type DiscoveredCjAdvertiser } from "./discovery";

const DEFAULT_TIMEOUT_MS = 30_000;

export type CjAdapterOptions = {
  config?: CjConfig;
  /** Injectable so tests never hit a real network. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * CJ (Commission Junction / CJ Affiliate) network adapter.
 *
 * Authentication is a long-lived Personal Access Token (CJ_API_KEY), sent
 * directly as `Authorization: Bearer <token>` — unlike Admitad, CJ has no
 * separate OAuth2 token-exchange step to perform first. CJ_WEBSITE_ID is
 * this account's own CID, sent as the `requestor-cid` parameter every
 * Advertiser Lookup call requires.
 *
 * CJ ENDPOINTS — SOURCED BUT NOT DIRECTLY VERIFIED. developers.cj.com is
 * blocked by this sandbox's network egress policy, so the Advertiser
 * Lookup endpoint (host, path, requestor-cid parameter, and the
 * advertiser-id/advertiser-name/account-status/relationship-status/
 * program-url response fields) is sourced from third-party documentation
 * of CJ's public API surface, not confirmed against CJ's own current docs
 * page directly. Parsing is deliberately defensive (see discovery.ts) so
 * a wrong assumption here degrades to "found nothing", never corrupted
 * data — and the admin UI's manual "Add Program" form works regardless of
 * whether this endpoint assumption turns out correct.
 *
 * Product synchronization (fetchProducts/fetchOffers/normalize) is
 * intentionally NOT implemented yet — this phase only covers
 * authentication, connection testing, and advertiser/program discovery.
 * Calling fetchProducts()/normalize() throws a clear "not implemented"
 * error rather than ever fabricating product data.
 */
export class CjAdapter implements AffiliateNetworkAdapter {
  readonly key = "cj";
  readonly label = "CJ";

  private readonly config: CjConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: CjAdapterOptions = {}) {
    this.config = options.config ?? getCjConfig();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async connect(): Promise<void> {
    if (!hasCjCredentials(this.config)) {
      throw new Error("CJ is not configured: set CJ_API_KEY and CJ_WEBSITE_ID.");
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    if (!hasCjCredentials(this.config)) {
      return { ok: false, message: "CJ is not configured: set CJ_API_KEY and CJ_WEBSITE_ID." };
    }
    try {
      await this.fetchAdvertiserLookupXml({});
      return { ok: true, message: "Connected to CJ." };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error connecting to CJ.";
      return { ok: false, message };
    }
  }

  /** The one real capability this phase implements: lists advertisers this account has any relationship with, via the Advertiser Lookup API. */
  async discoverPrograms(): Promise<DiscoveredCjAdvertiser[]> {
    if (!hasCjCredentials(this.config)) {
      throw new Error("CJ is not configured: set CJ_API_KEY and CJ_WEBSITE_ID.");
    }
    const xml = await this.fetchAdvertiserLookupXml({});
    return parseAdvertiserLookupResponse(xml);
  }

  async fetchProducts(_params: FetchProductsParams): Promise<FetchProductsResult> {
    void _params;
    throw new Error(
      "CJ product synchronization is not implemented yet — this phase only covers authentication, connection testing, and advertiser discovery."
    );
  }

  /** Unused until product sync exists — matches the safe empty-array default AdmitadAdapter uses for the same currently-unused interface method. */
  async fetchOffers(_externalProductId: string): Promise<NormalizedOffer[]> {
    void _externalProductId;
    return [];
  }

  normalize(_raw: unknown): NormalizedProduct {
    void _raw;
    throw new Error("CJ product normalization is not implemented yet.");
  }

  private async fetchAdvertiserLookupXml(filters: { advertiserIds?: string[] }): Promise<string> {
    const url = new URL(`${this.config.advertiserLookupBaseUrl}/v2/advertiser-lookup`);
    url.searchParams.set("requestor-cid", this.config.websiteId!);
    if (filters.advertiserIds?.length) {
      url.searchParams.set("advertiser-ids", filters.advertiserIds.join(","));
    }

    return withRetry(async () => {
      const response = await fetchWithTimeout(
        this.fetchImpl,
        url.toString(),
        { method: "GET", headers: { Authorization: `Bearer ${this.config.apiKey}` } },
        this.timeoutMs
      );
      if (!response.ok) throw errorForResponse(response);
      return response.text();
    });
  }
}
