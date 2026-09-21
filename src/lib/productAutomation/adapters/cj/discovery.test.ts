import { describe, it, expect } from "vitest";
import { parseAdvertiserLookupResponse } from "./discovery";

function xmlWithAdvertisers(advertisers: string[]) {
  return `<?xml version="1.0"?><cj-api><advertisers total-matched="${advertisers.length}">${advertisers.join("")}</advertisers></cj-api>`;
}

const ACME = `<advertiser>
  <advertiser-id>1234567</advertiser-id>
  <advertiser-name>Acme Store</advertiser-name>
  <account-status>active</account-status>
  <relationship-status>joined</relationship-status>
  <program-url><![CDATA[https://acme.example/affiliates]]></program-url>
</advertiser>`;

const BETA = `<advertiser>
  <advertiser-id>7654321</advertiser-id>
  <advertiser-name>Beta Co</advertiser-name>
  <account-status>active</account-status>
  <relationship-status>not-joined</relationship-status>
  <program-url/>
</advertiser>`;

describe("parseAdvertiserLookupResponse", () => {
  it("parses every advertiser record", () => {
    const advertisers = parseAdvertiserLookupResponse(xmlWithAdvertisers([ACME, BETA]));
    expect(advertisers).toEqual([
      { cjAdvertiserId: "1234567", advertiserName: "Acme Store", programUrl: "https://acme.example/affiliates", relationshipStatus: "joined", accountStatus: "active" },
      { cjAdvertiserId: "7654321", advertiserName: "Beta Co", programUrl: null, relationshipStatus: "not-joined", accountStatus: "active" },
    ]);
  });

  it("returns the same advertiser id twice if the response itself repeats it — de-duplication is upsertDiscoveredCjPrograms's job, not the parser's", () => {
    const advertisers = parseAdvertiserLookupResponse(xmlWithAdvertisers([ACME, ACME]));
    expect(advertisers).toHaveLength(2);
    expect(advertisers[0].cjAdvertiserId).toBe(advertisers[1].cjAdvertiserId);
  });

  it("skips a record missing an advertiser id or name rather than throwing", () => {
    const incomplete = `<advertiser><account-status>active</account-status></advertiser>`;
    const advertisers = parseAdvertiserLookupResponse(xmlWithAdvertisers([incomplete, ACME]));
    expect(advertisers).toHaveLength(1);
    expect(advertisers[0].cjAdvertiserId).toBe("1234567");
  });

  it("returns an empty array for an empty result set", () => {
    expect(parseAdvertiserLookupResponse(xmlWithAdvertisers([]))).toEqual([]);
  });

  it("returns an empty array for a non-XML or unexpected response rather than throwing", () => {
    expect(parseAdvertiserLookupResponse("")).toEqual([]);
    expect(parseAdvertiserLookupResponse("{\"not\":\"xml\"}")).toEqual([]);
    expect(parseAdvertiserLookupResponse("<html><body>Unauthorized</body></html>")).toEqual([]);
  });
});
