/**
 * Defensive parsing for CJ's `products` GraphQL query (Product Search API,
 * ads.api.cj.com/query), used ONLY as a way to discover which advertisers
 * this publisher account has actually joined — not for product
 * synchronization, which remains unimplemented.
 *
 * CJ's GraphQL API has no dedicated "list my advertiser relationships"
 * query. This was initially assumed to exist as `publisherQueries.
 * contracts` (per the account owner's own report of their schema access),
 * but a real account's live 400 response confirmed the root Query type has
 * no such field ("Cannot query field 'publisherQueries' on type 'Query'"),
 * independently corroborated by a third-party archive of the same schema
 * (github.com/api-evangelist/cj-affiliate, captured via live introspection,
 * 2026-08-13) which shows no `contracts`/`publisherQueries` field on any of
 * CJ's three GraphQL hosts (ads/commissions/tracking).
 *
 * What IS confirmed, from that same schema archive: `products` (and its
 * siblings `shoppingProducts`, `financeProducts`, ...) accepts a
 * `partnerStatus: PartnerStatus` argument whose `JOINED` value is
 * documented by CJ itself as "Restricts results to advertisers you have an
 * active relationship with," and every returned `Product` row carries
 * `advertiserId: ID!` / `advertiserName: String!` directly. So discovery
 * works by paginating `products(partnerStatus: JOINED, ...)` and
 * collecting the distinct advertisers out of the product rows returned —
 * see cjAdapter.ts's discoverPrograms() for the pagination/dedup logic.
 *
 * Parsing here is deliberately defensive (tolerant envelope unwrapping,
 * never throws on an unexpected shape) so a wrong assumption about the
 * exact response shape degrades to "found fewer/no products this page"
 * rather than corrupting cj_programs — same posture as discovery.ts's own
 * Advertiser Lookup parser and Admitad's discoverPrograms().
 */

export type DiscoveredJoinedAdvertiser = {
  cjAdvertiserId: string;
  advertiserName: string;
};

export type ProductsPage = {
  /** One entry per product row in this page — may contain duplicate advertisers. Deduping across pages is the caller's job (see cjAdapter.ts). */
  advertisers: DiscoveredJoinedAdvertiser[];
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

function parseProductRecord(raw: unknown): DiscoveredJoinedAdvertiser | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const cjAdvertiserId = firstString(obj, ["advertiserId", "advertiser_id"]);
  const advertiserName = firstString(obj, ["advertiserName", "advertiser_name"]);
  if (!cjAdvertiserId || !advertiserName) return null; // not enough to identify the advertiser

  return { cjAdvertiserId, advertiserName };
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
 * Unwraps `data.products` (the documented shape), but also tolerates a bare
 * `products`-shaped object being passed directly, since defensive tolerance
 * costs nothing here. Accepts `resultList` or `items` for the actual
 * product-row array, since the exact field name wasn't independently
 * re-verified beyond what the schema archive showed.
 */
export function parseProductsResponse(raw: unknown): ProductsPage {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  const productsNode = asRecord(data?.products) ?? data;

  if (!productsNode) return { advertisers: [], totalCount: null };

  let items: unknown[] = [];
  const resultList = productsNode.resultList ?? productsNode.items;
  if (Array.isArray(resultList)) {
    items = resultList;
  } else if (Array.isArray(raw)) {
    items = raw;
  }

  const advertisers: DiscoveredJoinedAdvertiser[] = [];
  for (const item of items) {
    const parsed = parseProductRecord(item);
    if (parsed) advertisers.push(parsed);
  }

  return {
    advertisers,
    totalCount: firstNumber(productsNode, ["totalCount", "total_count", "total"]),
  };
}
