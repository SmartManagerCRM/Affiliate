import { describe, it, expect } from "vitest";
import { extractXmlRecords, extractXmlField } from "./xml";

const SAMPLE = `<?xml version="1.0"?>
<cj-api>
  <advertisers total-matched="2">
    <advertiser>
      <advertiser-id>1234567</advertiser-id>
      <advertiser-name>Acme Store</advertiser-name>
      <account-status>active</account-status>
      <relationship-status>joined</relationship-status>
      <program-url><![CDATA[https://acme.example/affiliates]]></program-url>
    </advertiser>
    <advertiser>
      <advertiser-id>7654321</advertiser-id>
      <advertiser-name>Beta Co</advertiser-name>
      <account-status>active</account-status>
      <relationship-status>not-joined</relationship-status>
      <program-url/>
    </advertiser>
  </advertisers>
</cj-api>`;

describe("extractXmlRecords", () => {
  it("extracts every <advertiser> block", () => {
    const records = extractXmlRecords(SAMPLE, "advertiser");
    expect(records).toHaveLength(2);
  });

  it("returns an empty array when the tag never appears", () => {
    expect(extractXmlRecords(SAMPLE, "not-a-real-tag")).toEqual([]);
  });

  it("returns an empty array for garbage input rather than throwing", () => {
    expect(extractXmlRecords("not xml at all", "advertiser")).toEqual([]);
    expect(extractXmlRecords("", "advertiser")).toEqual([]);
  });
});

describe("extractXmlField", () => {
  const [first, second] = extractXmlRecords(SAMPLE, "advertiser");

  it("extracts a plain field", () => {
    expect(extractXmlField(first, "advertiser-id")).toBe("1234567");
    expect(extractXmlField(first, "advertiser-name")).toBe("Acme Store");
  });

  it("unwraps CDATA content", () => {
    expect(extractXmlField(first, "program-url")).toBe("https://acme.example/affiliates");
  });

  it("returns null for a self-closing (empty) tag", () => {
    expect(extractXmlField(second, "program-url")).toBeNull();
  });

  it("returns null for a tag that isn't present", () => {
    expect(extractXmlField(first, "seven-day-epc")).toBeNull();
  });

  it("returns null rather than throwing for malformed input", () => {
    expect(extractXmlField("<broken", "advertiser-id")).toBeNull();
  });
});
