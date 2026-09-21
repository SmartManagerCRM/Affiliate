import "server-only";

/**
 * Account-level CJ (Commission Junction / CJ Affiliate) configuration ONLY
 * — no advertiser/program data belongs here. There is exactly one CJ
 * connection per deployment; every advertiser this account has a
 * relationship with lives in the cj_programs Supabase table instead (see
 * programsStore.ts), discovered via CJ's Product Search GraphQL API or
 * added by hand. Adding an advertiser is a database row, never a Hostinger
 * environment variable.
 *
 * Unlike Admitad, CJ's publisher APIs authenticate with a long-lived
 * Personal Access Token (PAT) used directly as the Bearer token — there is
 * no separate OAuth2 client_credentials token-exchange step. CJ_API_KEY is
 * that PAT. CJ_WEBSITE_ID is the account's own CID ("company id"), used both
 * as the Advertiser Lookup API's `requestor-cid` parameter and as the
 * `companyId` argument to the Product Search GraphQL queries (`products`,
 * `shoppingProducts`, ...) — confirmed live against a real account
 * (2026-09-21): `ads.api.cj.com/query`'s root Query type has no
 * `publisherQueries`/`contracts` field at all (an earlier, incorrect
 * assumption — see cjAdapter.ts's history/citations), so advertiser
 * discovery now works by querying `products(companyId, partnerStatus:
 * JOINED, ...)` and collecting the distinct advertisers out of the
 * returned product rows instead.
 *
 * CJ_API_BASE_URL overrides the (secondary) Advertiser Lookup host;
 * CJ_GRAPHQL_API_URL overrides the Product Search GraphQL host — confirmed
 * reachable and correct at its default (ads.api.cj.com/query).
 *
 * PID — used only for product synchronization's `linkCode(pid: ...)` call,
 * which is what actually returns a CJ-tracked click URL (see
 * adapters/cj/products.ts's module doc comment for why `Product.link` itself
 * is NOT usable as the affiliate/buy-now URL). CJ's own schema gives no way
 * to look up an account's registered "property"/website PID via this API,
 * and many single-property accounts use the same identifier for both their
 * CID and their PID, so this defaults to CJ_WEBSITE_ID — override with
 * CJ_PID if a real sync run shows generated links are wrong (e.g. pointing
 * at the wrong property) for a multi-property account.
 */
const DEFAULT_ADVERTISER_LOOKUP_BASE_URL = "https://advertiser-lookup.api.cj.com";
const DEFAULT_GRAPHQL_API_URL = "https://ads.api.cj.com/query";

export type CjConfig = {
  apiKey: string | null;
  websiteId: string | null;
  pid: string | null;
  advertiserLookupBaseUrl: string;
  graphqlApiUrl: string;
};

export function getCjConfig(): CjConfig {
  const websiteId = process.env.CJ_WEBSITE_ID?.trim() || null;
  return {
    apiKey: process.env.CJ_API_KEY?.trim() || null,
    websiteId,
    pid: process.env.CJ_PID?.trim() || websiteId,
    advertiserLookupBaseUrl: process.env.CJ_API_BASE_URL?.trim() || DEFAULT_ADVERTISER_LOOKUP_BASE_URL,
    graphqlApiUrl: process.env.CJ_GRAPHQL_API_URL?.trim() || DEFAULT_GRAPHQL_API_URL,
  };
}

/** Enough to authenticate: a PAT and the CID it's scoped to. Never returns the values themselves. */
export function hasCjCredentials(config: CjConfig): boolean {
  return Boolean(config.apiKey && config.websiteId);
}
