import "server-only";

/**
 * Account-level CJ (Commission Junction / CJ Affiliate) configuration ONLY
 * — no advertiser/program data belongs here. There is exactly one CJ
 * connection per deployment; every advertiser this account has a
 * relationship with lives in the cj_programs Supabase table instead (see
 * programsStore.ts), discovered via the Advertiser Lookup API or added by
 * hand. Adding an advertiser is a database row, never a Hostinger
 * environment variable.
 *
 * Unlike Admitad, CJ's publisher APIs authenticate with a long-lived
 * Personal Access Token (PAT) used directly as the Bearer token — there is
 * no separate OAuth2 client_credentials token-exchange step. CJ_API_KEY is
 * that PAT. CJ_WEBSITE_ID is the account's own CID ("company id"), sent as
 * the `requestor-cid` parameter the Advertiser Lookup API requires.
 *
 * Sourced from CJ's own developer-portal-adjacent documentation (CJ
 * Developer Portal at developers.cj.com was unreachable from this sandbox's
 * network — see cjAdapter.ts's discoverPrograms() for the exact citations
 * used instead). CJ_API_BASE_URL overrides the Advertiser Lookup host if
 * it ever changes.
 */
const DEFAULT_ADVERTISER_LOOKUP_BASE_URL = "https://advertiser-lookup.api.cj.com";

export type CjConfig = {
  apiKey: string | null;
  websiteId: string | null;
  advertiserLookupBaseUrl: string;
};

export function getCjConfig(): CjConfig {
  return {
    apiKey: process.env.CJ_API_KEY?.trim() || null,
    websiteId: process.env.CJ_WEBSITE_ID?.trim() || null,
    advertiserLookupBaseUrl: process.env.CJ_API_BASE_URL?.trim() || DEFAULT_ADVERTISER_LOOKUP_BASE_URL,
  };
}

/** Enough to authenticate: a PAT and the CID it's scoped to. Never returns the values themselves. */
export function hasCjCredentials(config: CjConfig): boolean {
  return Boolean(config.apiKey && config.websiteId);
}
