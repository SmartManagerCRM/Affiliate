/**
 * Defensive parsing for CJ's `publisherQueries.contracts` GraphQL query —
 * the publisher's ACTUAL advertiser relationships (approved/pending/
 * terminated), as opposed to Advertiser Lookup's general directory search
 * which a real account confirmed does NOT reliably surface an already-
 * approved advertiser (see cjAdapter.ts's discoverPrograms() history).
 *
 * The exact schema (query name, argument names — advertiserId, publisherId,
 * limit, offset — and per-contract field names) was reported by the account
 * owner from their own live access to CJ's GraphQL schema. The query name
 * and those argument names were since confirmed against a real account: a
 * live 400 response from ads.api.cj.com/query only flagged the (now
 * removed, unused) activeAfter/activeBefore arguments for using a
 * nonexistent `Date` scalar type — see cjAdapter.ts's CONTRACTS_QUERY
 * comment. The per-contract field names within resultList remain
 * unconfirmed — CJ's developer portal and every mirror attempted are
 * blocked by this sandbox's network egress policy. Parsing is deliberately
 * defensive
 * (alias-based field lookup, tolerant envelope unwrapping, never throws
 * on an unexpected shape) so a wrong assumption about the exact response
 * shape degrades to "found fewer/no contracts" rather than corrupting
 * cj_programs — same posture as discovery.ts's own Advertiser Lookup
 * parser and Admitad's discoverPrograms().
 */

export type DiscoveredCjContract = {
  cjAdvertiserId: string;
  advertiserName: string;
  /** CJ's own contract/relationship status string (e.g. "active", "pending", "terminated"), stored as-is — never interpreted or filtered by this parser. Null when the response doesn't include one. */
  status: string | null;
};

export type ContractsPage = {
  contracts: DiscoveredCjContract[];
  /** The API's own reported total, when present — used to decide whether more pages remain. Null when absent (pagination then falls back to "page came back full, so ask for one more"). */
  totalCount: number | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function firstString(obj: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function firstNumber(obj: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function parseContractRecord(raw: unknown): DiscoveredCjContract | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const cjAdvertiserId = firstString(obj, ["advertiserId", "advertiser_id", "aid", "advertiserID"]);
  const advertiserName = firstString(obj, ["advertiserName", "advertiser_name", "name"]);
  if (!cjAdvertiserId || !advertiserName) return null; // not enough to be a usable program row

  return {
    cjAdvertiserId,
    advertiserName,
    status: firstString(obj, ["status", "contractStatus", "relationshipStatus", "state"]),
  };
}

/** GraphQL errors (a top-level `errors` array) are a real failure, not "zero results" — this surfaces them so the caller throws instead of silently reporting an empty account. */
export function extractGraphQLErrorMessage(raw: unknown): string | null {
  const obj = asRecord(raw);
  const errors = obj?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;

  const messages = errors
    .map((e) => asRecord(e))
    .map((e) => (e && typeof e.message === "string" ? e.message : null))
    .filter((m): m is string => Boolean(m));

  return messages.length > 0 ? messages.join("; ") : "CJ GraphQL request returned an error.";
}

/**
 * Unwraps `data.publisherQueries.contracts` (the documented shape), but
 * also tolerates a flatter `data.contracts` or a bare `contracts`-shaped
 * object being passed directly, since the exact nesting wasn't
 * independently confirmed. Accepts `resultList`, `results`, `items`, or a
 * GraphQL-connection-style `edges[].node` for the actual record array —
 * whichever CJ's real response turns out to use.
 */
export function parseContractsResponse(raw: unknown): ContractsPage {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  const publisherQueries = asRecord(data?.publisherQueries);
  const contractsNode = asRecord(publisherQueries?.contracts) ?? asRecord(data?.contracts) ?? data;

  if (!contractsNode) return { contracts: [], totalCount: null };

  let items: unknown[] = [];
  const resultList = contractsNode.resultList ?? contractsNode.results ?? contractsNode.items;
  if (Array.isArray(resultList)) {
    items = resultList;
  } else if (Array.isArray(contractsNode.edges)) {
    items = contractsNode.edges.map((edge) => asRecord(edge)?.node).filter(Boolean);
  } else if (Array.isArray(raw)) {
    items = raw;
  }

  const contracts: DiscoveredCjContract[] = [];
  for (const item of items) {
    const parsed = parseContractRecord(item);
    if (parsed) contracts.push(parsed);
  }

  return {
    contracts,
    totalCount: firstNumber(contractsNode, ["totalCount", "total_count", "total"]),
  };
}
