/**
 * Defensive parsing for Admitad's "list advertiser programs" API response —
 * split out from admitadAdapter.ts so this mapping is unit-testable without
 * a network call, mirroring feedParser.ts's approach to the CSV feed.
 *
 * The exact response shape is UNVERIFIED (no live access to admitad.com in
 * this sandbox — see admitadAdapter.ts's discoverPrograms() for the full
 * caveat). Every field is read defensively via alias lists and a missing/
 * unexpected field just produces a program with that field null, never a
 * thrown error — a wrong assumption here degrades to "discovered less than
 * it should have," not a crash or corrupted data.
 */

export type DiscoveredProgram = {
  admitadProgramId: string;
  advertiserName: string;
  country: string | null;
  feedId: string | null;
  feedUrl: string | null;
};

function firstString(obj: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

/** One discovered-program record, from whatever shape a single item in the response array turns out to have. */
function parseDiscoveredProgram(raw: unknown): DiscoveredProgram | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const admitadProgramId = firstString(obj, ["id", "campaign_id", "advcampaign_id"]);
  const advertiserName = firstString(obj, ["name", "advertiser_name", "website_name"]);
  if (!admitadProgramId || !advertiserName) return null; // not enough to be a usable program row

  return {
    admitadProgramId,
    advertiserName,
    country: firstString(obj, ["country", "country_code", "region"]),
    feedId: firstString(obj, ["feed_id", "product_feed_id"]),
    feedUrl: firstString(obj, ["feed_url", "product_feed_url", "products_feed_url"]),
  };
}

/** The response could reasonably be a bare array, or {results: [...]}, or {data: [...]} — all are plausible for an Admitad-style paginated list endpoint. Unpack whichever shape actually comes back rather than assuming one. */
export function parseDiscoveredPrograms(raw: unknown): DiscoveredProgram[] {
  let items: unknown[];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const candidate = obj.results ?? obj.data ?? obj.items;
    items = Array.isArray(candidate) ? candidate : [];
  } else {
    items = [];
  }

  const programs: DiscoveredProgram[] = [];
  for (const item of items) {
    const parsed = parseDiscoveredProgram(item);
    if (parsed) programs.push(parsed);
  }
  return programs;
}
