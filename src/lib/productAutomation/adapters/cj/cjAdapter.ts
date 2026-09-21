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
import { withRetry, errorForResponse, fetchWithTimeout, HttpStatusError } from "../../httpRetry";
import { parseAdvertiserLookupResponse, type DiscoveredCjAdvertiser } from "./discovery";
import { parseProductsResponse, extractGraphQLErrorMessage, type DiscoveredJoinedAdvertiser } from "./joinedAdvertisers";
import { normalizeProductRow, parseProductsFeedPage } from "./products";

const DEFAULT_TIMEOUT_MS = 30_000;
const PRODUCTS_PAGE_SIZE = 100;
const MAX_PRODUCT_PAGES = 500; // safety bound — a large catalog may need many pages just to see every joined advertiser once
const PRODUCTS_FEED_PAGE_SIZE = 100;

/**
 * Deliberately minimal: only the two fields discoverPrograms() needs to
 * identify an advertiser. `partnerStatus: JOINED` is hardcoded as a literal
 * (not a variable) — it's always the same value here, and hardcoding avoids
 * needing to reference the `PartnerStatus` enum's exact type name as a
 * variable type (the same mistake that broke the `Date` scalar earlier).
 */
const PRODUCTS_QUERY = `
  query DiscoverJoinedAdvertisers($companyId: ID!, $limit: Int, $offset: Int) {
    products(companyId: $companyId, partnerStatus: JOINED, limit: $limit, offset: $offset) {
      totalCount
      resultList {
        advertiserId
        advertiserName
      }
    }
  }
`;

/**
 * Full product record for synchronization — filtered to one advertiser
 * (`partnerIds`) at a time, matching the sync engine's one-program-per-run
 * model (see runScheduledSync.ts's runCjPrograms()). Every selected field is
 * one confirmed to exist on the `Product` interface by the same verified
 * schema archive cited in products.ts — see that file for the full
 * citation trail and, critically, why `link` is deliberately NOT selected
 * for use as the affiliate URL (`linkCode.clickUrl` is — see products.ts).
 * `pid` is required by `linkCode` itself; sourced from config.ts's PID
 * (defaults to CJ_WEBSITE_ID, overridable via CJ_PID).
 */
const PRODUCTS_FEED_QUERY = `
  query FetchAdvertiserProducts($companyId: ID!, $partnerIds: [ID!], $pid: ID!, $limit: Int, $offset: Int) {
    products(companyId: $companyId, partnerIds: $partnerIds, partnerStatus: JOINED, limit: $limit, offset: $offset) {
      totalCount
      resultList {
        id
        title
        description
        brand
        advertiserName
        targetCountry
        imageLink
        additionalImageLink
        isDeleted
        price { amount currency }
        salePrice { amount currency }
        linkCode(pid: $pid) { clickUrl }
      }
    }
  }
`;

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
 * separate OAuth2 token-exchange step to perform first.
 *
 * DISCOVERY SOURCE — HISTORY. The original implementation used the
 * Advertiser Lookup REST API (fetchAdvertiserLookupXml, kept below as
 * lookupAdvertisers(), no longer called by discoverPrograms/testConnection)
 * — a general advertiser *directory* search that a real account confirmed
 * does not reliably reflect this account's own approved relationships. That
 * was replaced with a `publisherQueries.contracts` GraphQL query, based on
 * the account owner's own report of their CJ schema access — but a live
 * request against the real account came back with "Cannot query field
 * 'publisherQueries' on type 'Query'", proving that field doesn't exist on
 * ads.api.cj.com's actual Query type. Independently corroborated by a
 * third-party archive of the same schema (github.com/api-evangelist/
 * cj-affiliate, captured via live introspection, 2026-08-13): no
 * `contracts`/`publisherQueries` field exists on any of CJ's three GraphQL
 * hosts (ads/commissions/tracking).
 *
 * DISCOVERY SOURCE — CURRENT. CJ's GraphQL API has no dedicated "list my
 * advertiser relationships" query at all. What IS confirmed (from the same
 * schema archive): `products` accepts `partnerStatus: PartnerStatus`, whose
 * `JOINED` value CJ documents as "Restricts results to advertisers you have
 * an active relationship with," and every returned `Product` row carries
 * `advertiserId`/`advertiserName` directly. So discoverPrograms() instead
 * pages through `products(companyId, partnerStatus: JOINED, ...)` and
 * collects the distinct advertisers out of the product rows — see
 * joinedAdvertisers.ts for the full citation trail and parsing.
 *
 * TRADE-OFF: this means discovery pages through the account's actual
 * product catalog (bounded by MAX_PRODUCT_PAGES), not a short dedicated
 * list — an account with a very large catalog may take many requests, and
 * could in principle hit the page bound before reaching every advertiser's
 * products (in practice, advertisers with any products at all tend to
 * appear within the first pages, but this is a real, documented limitation
 * of not having a proper relationship-listing endpoint to call instead).
 * Parsing never throws on an unexpected shape — a wrong assumption degrades
 * to "found fewer/no advertisers this page", and the admin UI's manual "Add
 * Program" form works regardless.
 *
 * PRODUCT SYNCHRONIZATION. fetchProducts() queries the same `products`
 * field as discoverPrograms(), but filtered to one advertiser at a time via
 * `partnerIds` (the sync engine calls it once per active cj_programs row —
 * see runScheduledSync.ts's runCjPrograms()) and selecting full product
 * fields instead of just the advertiser identity. See products.ts's module
 * doc comment for the field-by-field mapping and, most importantly, why the
 * buy-now URL comes from `linkCode.clickUrl` and never from `link` (the
 * merchant's own untracked landing page).
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
      await this.fetchJoinedProductsPage({ limit: 1, offset: 0 });
      return { ok: true, message: "Connected to CJ." };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error connecting to CJ.";
      return { ok: false, message };
    }
  }

  /**
   * Lists advertisers this account has actually joined, by paginating
   * `products(partnerStatus: JOINED)` (PRODUCTS_PAGE_SIZE per page, bounded
   * by MAX_PRODUCT_PAGES) and deduping the distinct advertisers out of the
   * product rows returned — see the class-level doc comment for why this
   * indirect approach is necessary and its trade-offs.
   */
  async discoverPrograms(): Promise<DiscoveredJoinedAdvertiser[]> {
    if (!hasCjCredentials(this.config)) {
      throw new Error("CJ is not configured: set CJ_API_KEY and CJ_WEBSITE_ID.");
    }

    const seen = new Map<string, DiscoveredJoinedAdvertiser>();
    let offset = 0;

    for (let page = 0; page < MAX_PRODUCT_PAGES; page++) {
      const result = await this.fetchJoinedProductsPage({ limit: PRODUCTS_PAGE_SIZE, offset });
      for (const advertiser of result.advertisers) {
        if (!seen.has(advertiser.cjAdvertiserId)) seen.set(advertiser.cjAdvertiserId, advertiser);
      }

      offset += PRODUCTS_PAGE_SIZE;
      const knowsTotal = result.totalCount !== null;
      const exhaustedKnownTotal = knowsTotal && offset >= (result.totalCount as number);
      // Uses the raw per-product-row count for this page, not the deduped
      // advertiser count — a full page of products can collapse into very
      // few distinct advertisers without that meaning the page was short.
      const pageWasShort = result.advertisers.length < PRODUCTS_PAGE_SIZE;
      if (exhaustedKnownTotal || pageWasShort) break;
    }

    return Array.from(seen.values());
  }

  /** Kept for a possible secondary/manual-lookup use, but no longer called by discoverPrograms()/testConnection() — see the class-level caveat above for why. */
  async lookupAdvertisers(): Promise<DiscoveredCjAdvertiser[]> {
    const xml = await this.fetchAdvertiserLookupXml({});
    return parseAdvertiserLookupResponse(xml);
  }

  /**
   * Pulls one page of a single advertiser's products, mapped to
   * NormalizedProduct — the sync engine (syncEngine.ts) calls this
   * repeatedly per program until hasMore is false, exactly like Admitad's
   * fetchProducts() pages through one feed. `params.advertiserId` is
   * required here (set by runCjPrograms() from the program's
   * cj_advertiser_id) since CJ's product API has no single fixed feed to
   * fall back to.
   */
  async fetchProducts(params: FetchProductsParams): Promise<FetchProductsResult> {
    if (!params.advertiserId) {
      throw new Error("No advertiser id was provided for this CJ program — check its cj_programs row.");
    }
    if (!hasCjCredentials(this.config)) {
      throw new Error("CJ is not configured: set CJ_API_KEY and CJ_WEBSITE_ID.");
    }

    const limit = params.limit ?? PRODUCTS_FEED_PAGE_SIZE;
    const offset = params.cursor ? Number(params.cursor) : 0;

    const page = await this.fetchAdvertiserProductsPage({ advertiserId: params.advertiserId, limit, offset });

    const nextOffset = offset + page.products.length;
    const knowsTotal = page.totalCount !== null;
    const hasMore = knowsTotal ? nextOffset < (page.totalCount as number) : page.products.length === limit;

    return {
      products: page.products,
      hasMore,
      nextCursor: hasMore ? String(nextOffset) : null,
    };
  }

  /** Unused by the current pipeline (offers come back inline with each product from fetchProducts) — matches AdmitadAdapter's own comment on the same currently-unused interface method. */
  async fetchOffers(_externalProductId: string): Promise<NormalizedOffer[]> {
    void _externalProductId;
    return [];
  }

  normalize(raw: unknown): NormalizedProduct {
    return normalizeProductRow(raw);
  }

  private async fetchJoinedProductsPage(params: { limit: number; offset: number }) {
    const body = JSON.stringify({
      query: PRODUCTS_QUERY,
      variables: {
        companyId: this.config.websiteId,
        limit: params.limit,
        offset: params.offset,
      },
    });

    const json = await withRetry(async () => {
      const response = await fetchWithTimeout(
        this.fetchImpl,
        this.config.graphqlApiUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body,
        },
        this.timeoutMs
      );
      if (!response.ok) throw await this.errorForGraphQLResponse(response);
      return response.json();
    });

    const errorMessage = extractGraphQLErrorMessage(json);
    if (errorMessage) throw new Error(`CJ products query failed: ${errorMessage}`);

    return parseProductsResponse(json);
  }

  private async fetchAdvertiserProductsPage(params: { advertiserId: string; limit: number; offset: number }) {
    const body = JSON.stringify({
      query: PRODUCTS_FEED_QUERY,
      variables: {
        companyId: this.config.websiteId,
        partnerIds: [params.advertiserId],
        pid: this.config.pid,
        limit: params.limit,
        offset: params.offset,
      },
    });

    const json = await withRetry(async () => {
      const response = await fetchWithTimeout(
        this.fetchImpl,
        this.config.graphqlApiUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body,
        },
        this.timeoutMs
      );
      if (!response.ok) throw await this.errorForGraphQLResponse(response);
      return response.json();
    });

    const errorMessage = extractGraphQLErrorMessage(json);
    if (errorMessage) throw new Error(`CJ products query failed for advertiser ${params.advertiserId}: ${errorMessage}`);

    return parseProductsFeedPage(json);
  }

  /**
   * errorForResponse() alone only reports the HTTP status — deliberately,
   * since it's shared across every adapter and has no vendor-specific
   * knowledge of response bodies. A GraphQL endpoint's 4xx (malformed
   * query, invalid variable type, unknown field, ...) almost always carries
   * the real explanation in a JSON `errors` array or a plain-text body, so
   * this reads and surfaces it — the bare status code alone isn't enough to
   * diagnose a real discovery failure (this is exactly how the
   * publisherQueries.contracts field and the Date scalar type were both
   * proven wrong against a real account). Never throws itself: a body
   * that isn't readable or parseable just falls back to the plain status
   * error, same as before.
   */
  private async errorForGraphQLResponse(response: Response): Promise<Error> {
    const baseError = errorForResponse(response);
    if (!(baseError instanceof HttpStatusError)) return baseError; // e.g. 429 — no extra body detail needed

    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch {
      return baseError;
    }
    if (!bodyText.trim()) return baseError;

    let detail: string | null = null;
    try {
      const parsed = JSON.parse(bodyText);
      detail = extractGraphQLErrorMessage(parsed);
      if (!detail && parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        if (typeof obj.message === "string") detail = obj.message;
        else if (typeof obj.error === "string") detail = obj.error;
      }
    } catch {
      detail = bodyText.slice(0, 500);
    }

    return detail ? new HttpStatusError(`${baseError.message}: ${detail}`, baseError.status) : baseError;
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
