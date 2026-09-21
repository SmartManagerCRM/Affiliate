import { describe, it, expect } from "vitest";
import { parseDiscoveredPrograms } from "./discovery";

describe("parseDiscoveredPrograms", () => {
  it("parses a bare array response", () => {
    const programs = parseDiscoveredPrograms([
      { id: "123", name: "Acme Store", country: "AE", feed_url: "https://acme.example/feed.csv" },
    ]);
    expect(programs).toEqual([
      { admitadProgramId: "123", advertiserName: "Acme Store", country: "AE", feedId: null, feedUrl: "https://acme.example/feed.csv" },
    ]);
  });

  it("unwraps a {results: [...]} envelope", () => {
    const programs = parseDiscoveredPrograms({ results: [{ id: "1", name: "A" }] });
    expect(programs).toHaveLength(1);
  });

  it("unwraps a {data: [...]} envelope", () => {
    const programs = parseDiscoveredPrograms({ data: [{ id: "1", name: "A" }] });
    expect(programs).toHaveLength(1);
  });

  it("unwraps a {items: [...]} envelope", () => {
    const programs = parseDiscoveredPrograms({ items: [{ id: "1", name: "A" }] });
    expect(programs).toHaveLength(1);
  });

  it("falls back to field-name aliases", () => {
    const programs = parseDiscoveredPrograms([{ campaign_id: "9", advertiser_name: "Beta Co", region: "SA" }]);
    expect(programs).toEqual([{ admitadProgramId: "9", advertiserName: "Beta Co", country: "SA", feedId: null, feedUrl: null }]);
  });

  it("accepts a numeric id and coerces it to a string", () => {
    const programs = parseDiscoveredPrograms([{ id: 42, name: "Numeric Id Co" }]);
    expect(programs[0].admitadProgramId).toBe("42");
  });

  it("skips an item missing both id and name rather than throwing", () => {
    const programs = parseDiscoveredPrograms([{ country: "AE" }, { id: "1", name: "Valid" }]);
    expect(programs).toHaveLength(1);
    expect(programs[0].admitadProgramId).toBe("1");
  });

  it("returns an empty array for null, a string, or an unrecognized shape, never throws", () => {
    expect(parseDiscoveredPrograms(null)).toEqual([]);
    expect(parseDiscoveredPrograms("unexpected")).toEqual([]);
    expect(parseDiscoveredPrograms({ unexpected: "shape" })).toEqual([]);
    expect(parseDiscoveredPrograms(undefined)).toEqual([]);
  });

  it("skips a non-object item inside the array", () => {
    const programs = parseDiscoveredPrograms(["not an object", { id: "1", name: "Valid" }]);
    expect(programs).toHaveLength(1);
  });
});
