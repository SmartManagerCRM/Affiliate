import { describe, it, expect } from "vitest";
import { parseContractsResponse, extractGraphQLErrorMessage } from "./contracts";

const APPROVED = { advertiserId: "1234567", advertiserName: "Acme Store", status: "active" };
const PENDING = { advertiserId: "7654321", advertiserName: "Beta Co", status: "pending" };

describe("parseContractsResponse", () => {
  it("parses the documented data.publisherQueries.contracts.resultList shape", () => {
    const response = {
      data: { publisherQueries: { contracts: { totalCount: 2, resultList: [APPROVED, PENDING] } } },
    };
    const page = parseContractsResponse(response);
    expect(page.totalCount).toBe(2);
    expect(page.contracts).toEqual([
      { cjAdvertiserId: "1234567", advertiserName: "Acme Store", status: "active" },
      { cjAdvertiserId: "7654321", advertiserName: "Beta Co", status: "pending" },
    ]);
  });

  it("tolerates a flatter data.contracts shape", () => {
    const response = { data: { contracts: { resultList: [APPROVED] } } };
    expect(parseContractsResponse(response).contracts).toHaveLength(1);
  });

  it("tolerates results/items in place of resultList", () => {
    expect(parseContractsResponse({ data: { publisherQueries: { contracts: { results: [APPROVED] } } } }).contracts).toHaveLength(1);
    expect(parseContractsResponse({ data: { publisherQueries: { contracts: { items: [APPROVED] } } } }).contracts).toHaveLength(1);
  });

  it("tolerates a GraphQL-connection edges/node shape", () => {
    const response = { data: { publisherQueries: { contracts: { edges: [{ node: APPROVED }, { node: PENDING }] } } } };
    expect(parseContractsResponse(response).contracts).toHaveLength(2);
  });

  it("falls back to alias field names when the primary ones are absent", () => {
    const response = { data: { publisherQueries: { contracts: { resultList: [{ aid: "999", name: "Gamma Inc", state: "terminated" }] } } } };
    expect(parseContractsResponse(response).contracts).toEqual([{ cjAdvertiserId: "999", advertiserName: "Gamma Inc", status: "terminated" }]);
  });

  it("never discards a contract based on its status — status is informational only", () => {
    const response = { data: { publisherQueries: { contracts: { resultList: [PENDING] } } } };
    expect(parseContractsResponse(response).contracts).toEqual([{ cjAdvertiserId: "7654321", advertiserName: "Beta Co", status: "pending" }]);
  });

  it("skips a record missing an advertiser id or name rather than throwing", () => {
    const incomplete = { status: "active" };
    const response = { data: { publisherQueries: { contracts: { resultList: [incomplete, APPROVED] } } } };
    expect(parseContractsResponse(response).contracts).toEqual([{ cjAdvertiserId: "1234567", advertiserName: "Acme Store", status: "active" }]);
  });

  it("returns an empty page for an empty result set", () => {
    const response = { data: { publisherQueries: { contracts: { totalCount: 0, resultList: [] } } } };
    expect(parseContractsResponse(response)).toEqual({ contracts: [], totalCount: 0 });
  });

  it("returns an empty page rather than throwing for null, a string, or an unrecognized shape", () => {
    expect(parseContractsResponse(null)).toEqual({ contracts: [], totalCount: null });
    expect(parseContractsResponse("unexpected")).toEqual({ contracts: [], totalCount: null });
    expect(parseContractsResponse({ unexpected: "shape" })).toEqual({ contracts: [], totalCount: null });
    expect(parseContractsResponse(undefined)).toEqual({ contracts: [], totalCount: null });
  });
});

describe("extractGraphQLErrorMessage", () => {
  it("extracts and joins message(s) from a top-level errors array", () => {
    const response = { errors: [{ message: "Unauthorized" }, { message: "Invalid publisherId" }] };
    expect(extractGraphQLErrorMessage(response)).toBe("Unauthorized; Invalid publisherId");
  });

  it("returns null when there is no errors array", () => {
    expect(extractGraphQLErrorMessage({ data: { publisherQueries: { contracts: { resultList: [] } } } })).toBeNull();
  });

  it("returns null for a non-object response", () => {
    expect(extractGraphQLErrorMessage(null)).toBeNull();
    expect(extractGraphQLErrorMessage("not an object")).toBeNull();
  });

  it("falls back to a generic message when errors exist but have no message field", () => {
    expect(extractGraphQLErrorMessage({ errors: [{ code: "FORBIDDEN" }] })).toBe("CJ GraphQL request returned an error.");
  });
});
