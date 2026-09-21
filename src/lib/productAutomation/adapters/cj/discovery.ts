import { extractXmlRecords, extractXmlField } from "./xml";

/**
 * Parses a CJ Advertiser Lookup API response into advertiser records.
 *
 * Field names (advertiser-id, advertiser-name, account-status,
 * relationship-status, program-url) and the <cj-api><advertisers>
 * <advertiser>...</advertiser></advertisers></cj-api> XML shape are
 * sourced from third-party documentation of CJ's REST API surface — this
 * sandbox could not reach developers.cj.com directly (blocked by the
 * environment's network egress policy) to confirm against CJ's own
 * current docs, so treat this as well-sourced but NOT independently
 * verified. Parsing is deliberately defensive (extractXmlField never
 * throws, a missing/renamed tag just yields null) so a wrong assumption
 * here degrades to "found fewer/no advertisers" rather than corrupting
 * cj_programs — same posture as admitad/discovery.ts's own caveat.
 */

export type DiscoveredCjAdvertiser = {
  cjAdvertiserId: string;
  advertiserName: string;
  programUrl: string | null;
  relationshipStatus: string | null;
  accountStatus: string | null;
};

export function parseAdvertiserLookupResponse(xml: string): DiscoveredCjAdvertiser[] {
  const records = extractXmlRecords(xml, "advertiser");
  const advertisers: DiscoveredCjAdvertiser[] = [];

  for (const record of records) {
    const cjAdvertiserId = extractXmlField(record, "advertiser-id");
    const advertiserName = extractXmlField(record, "advertiser-name");
    if (!cjAdvertiserId || !advertiserName) continue; // not enough to be a usable program row

    advertisers.push({
      cjAdvertiserId,
      advertiserName,
      programUrl: extractXmlField(record, "program-url"),
      relationshipStatus: extractXmlField(record, "relationship-status"),
      accountStatus: extractXmlField(record, "account-status"),
    });
  }

  return advertisers;
}
