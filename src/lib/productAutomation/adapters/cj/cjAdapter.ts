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
import { parseContractsResponse, extractGraphQLErrorMessage, type DiscoveredCjContract } from "./contracts";

const DEFAULT_TIMEOUT_MS = 30_000;
const CONTRACTS_PAGE_SIZE = 100;
const MAX_CONTRACTS_PAGES = 200; // safety bound against a misbehaving/always-full-page API

export type CjAdapterOptions = {
  config?: CjConfig;
  /** Injectable so tests never hit a real network. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * activeAfter/activeBefore are deliberately NOT included as query variables:
 * a real account's response confirmed CJ's schema rejects a `Date` scalar
 * type ("Unknown type 'Date'") for them, and since this adapter never
 * actually filters by date (always called with limit/offset/advertiserId
 * only), the safe fix is to drop the two unused arguments rather than guess
 * another type name blind. If date filtering is ever needed, the correct
 * scalar type must be confirmed against CJ's real schema first.
 */
const CONTRACTS_QUERY = `
  query PublisherContracts($publisherId: ID!, $advertiserId: ID, $limit: Int, $offset: Int) {
    publisherQueries {
      contracts(publisherId: $publisherId, advertiserId: $advertiserId, limit: $limit, offset: $offset) {
        totalCount
        resultList {
          advertiserId
          advertiserName
          status
        }
      }
    }
  }
`;

/**
 * CJ (Commission Junction / CJ Affiliate) network adapter.
 *
 * Authentication is a long-lived Personal Access Token (CJ_API_KEY), sent
 * directly as `Authorization: Bearer <token>` — unlike Admitad, CJ has no
 * separate OAuth2 token-exchange step to perform first.
 *
 * DISCOVERY SOURCE — CHANGED after a real account confirmed the original
 * implementation missed an already-APPROVED advertiser. The Advertiser
 * Lookup REST API (fetchAdvertiserLookupXml, kept below but no longer
 * called by discoverPrograms/testConnection) is a general advertiser
 * *directory* search — it does not reliably reflect this account's own
 * approved relationships. Discovery now calls the `publisherQueries.
 * contracts` GraphQL query instead, which is what actually returns the
 * publisher's real advertiser relationships/contract status.
 *
 * CJ ENDPOINTS — PARTIALLY VERIFIED against a real account (2026-09-21).
 * developers.cj.com and every mirror attempted are still blocked by this
 * sandbox's network egress policy, so the schema was sourced from the
 * account owner's own live access, not confirmed independently — but a
 * real 400 response from ads.api.cj.com/query confirmed: the host is
 * reachable and authenticates the request; the query name, and the
 * `publisherId`/`advertiserId`/`limit`/`offset` argument names on
 * `publisherQueries.contracts`, all passed CJ's own schema validation
 * (the ONLY reported violation was `$activeAfter`/`$activeBefore` typed as
 * a nonexistent `Date` scalar — those two arguments were unused anyway
 * (always null) and have been removed rather than guessing another type
 * name). What's still genuinely unverified: the per-contract field names
 * within resultList (defensive alias lookup — see contracts.ts), and
 * whether `publisherId` is really the same identifier as
 * CJ_WEBSITE_ID/requestor-cid or a distinct one (if discovery still comes
 * up empty or errors after this fix, that mapping is the next thing to
 * check). Parsing never throws on an unexpected shape — a wrong assumption
 * degrades to "found fewer/no contracts", and the admin UI's manual "Add
 * Program" form works regardless.
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
      await this.fetchContractsPage({ limit: 1, offset: 0 });
      return { ok: true, message: "Connected to CJ." };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error connecting to CJ.";
      return { ok: false, message };
    }
  }

  /**
   * Lists advertisers this account actually has a contract/relationship
   * with, via the Contracts GraphQL query — paginated (CONTRACTS_PAGE_SIZE
   * per page, bounded by MAX_CONTRACTS_PAGES) so an account with more than
   * one page of relationships doesn't silently lose anything past page one,
   * unlike the previous Advertiser Lookup-based implementation.
   */
  async discoverPrograms(): Promise<DiscoveredCjContract[]> {
    if (!hasCjCredentials(this.config)) {
      throw new Error("CJ is not configured: set CJ_API_KEY and CJ_WEBSITE_ID.");
    }

    const all: DiscoveredCjContract[] = [];
    let offset = 0;

    for (let page = 0; page < MAX_CONTRACTS_PAGES; page++) {
      const result = await this.fetchContractsPage({ limit: CONTRACTS_PAGE_SIZE, offset });
      all.push(...result.contracts);

      offset += CONTRACTS_PAGE_SIZE;
      const knowsTotal = result.totalCount !== null;
      const exhaustedKnownTotal = knowsTotal && offset >= (result.totalCount as number);
      const pageWasShort = result.contracts.length < CONTRACTS_PAGE_SIZE;
      if (exhaustedKnownTotal || pageWasShort) break;
    }

    return all;
  }

  /** Kept for a possible secondary/manual-lookup use, but no longer called by discoverPrograms()/testConnection() — see the class-level caveat above for why. */
  async lookupAdvertisers(): Promise<DiscoveredCjAdvertiser[]> {
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

  private async fetchContractsPage(params: { limit: number; offset: number; advertiserId?: string }) {
    const body = JSON.stringify({
      query: CONTRACTS_QUERY,
      variables: {
        publisherId: this.config.websiteId,
        advertiserId: params.advertiserId ?? null,
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
      if (!response.ok) throw await this.errorForContractsResponse(response);
      return response.json();
    });

    const errorMessage = extractGraphQLErrorMessage(json);
    if (errorMessage) throw new Error(`CJ Contracts query failed: ${errorMessage}`);

    return parseContractsResponse(json);
  }

  /**
   * errorForResponse() alone only reports the HTTP status — deliberately,
   * since it's shared across every adapter and has no vendor-specific
   * knowledge of response bodies. A GraphQL endpoint's 4xx (malformed
   * query, invalid variable type, wrong operation name, ...) almost always
   * carries the real explanation in a JSON `errors` array or a plain-text
   * body, so this reads and surfaces it — the bare status code alone isn't
   * enough to diagnose a real discovery failure. Never throws itself: a
   * body that isn't readable or parseable just falls back to the plain
   * status error, same as before.
   */
  private async errorForContractsResponse(response: Response): Promise<Error> {
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
