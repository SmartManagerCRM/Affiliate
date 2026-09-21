import { describe, it, expect } from "vitest";
import { parseProductsResponse, extractGraphQLErrorMessage } from "./joinedAdvertisers";

const PRODUCT_A = { advertiserId: "1234567", advertiserName: "Acme Store" };
const PRODUCT_B = { advertiserId: "7654321", advertiserName: "Beta Co" };

describe("parseProductsResponse", () => {
  it("parses the documented data.products.resultList shape", () => {
    const response = { data: { products: { totalCount: 250, resultList: [PRODUCT_A, PRODUCT_B] } } };
    const page = parseProductsResponse(response);
    expect(page.totalCount).toBe(250);
    expect(page.advertisers).toEqual([
      { cjAdvertiserId: "1234567", advertiserName: "Acme Store" },
      { cjAdvertiserId: "7654321", advertiserName: "Beta Co" },
    ]);
  });

  it("keeps one entry per product row, including duplicate advertisers — deduping is the caller's job", () => {
    const response = { data: { products: { resultList: [PRODUCT_A, PRODUCT_A, PRODUCT_B] } } };
    expect(parseProductsResponse(response).advertisers).toHaveLength(3);
  });

  it("tolerates a bare products-shaped object passed directly", () => {
    const response = { resultList: [PRODUCT_A] };
    expect(parseProductsResponse(response).advertisers).toHaveLength(1);
  });

  it("tolerates items in place of resultList", () => {
    expect(parseProductsResponse({ data: { products: { items: [PRODUCT_A] } } }).advertisers).toHaveLength(1);
  });

  it("skips a product row missing an advertiser id or name rather than throwing", () => {
    const incomplete = { advertiserId: "999" }; // no advertiserName
    const response = { data: { products: { resultList: [incomplete, PRODUCT_A] } } };
    expect(parseProductsResponse(response).advertisers).toEqual([{ cjAdvertiserId: "1234567", advertiserName: "Acme Store" }]);
  });

  it("returns an empty page for an empty result set", () => {
    const response = { data: { products: { totalCount: 0, resultList: [] } } };
    expect(parseProductsResponse(response)).toEqual({ advertisers: [], totalCount: 0 });
  });

  it("returns an empty page rather than throwing for null, a string, or an unrecognized shape", () => {
    expect(parseProductsResponse(null)).toEqual({ advertisers: [], totalCount: null });
    expect(parseProductsResponse("unexpected")).toEqual({ advertisers: [], totalCount: null });
    expect(parseProductsResponse({ unexpected: "shape" })).toEqual({ advertisers: [], totalCount: null });
    expect(parseProductsResponse(undefined)).toEqual({ advertisers: [], totalCount: null });
  });
});

describe("extractGraphQLErrorMessage", () => {
  it("extracts and joins message(s) from a top-level errors array", () => {
    const response = { errors: [{ message: "Unauthorized" }, { message: "Invalid companyId" }] };
    expect(extractGraphQLErrorMessage(response)).toBe("Unauthorized; Invalid companyId");
  });

  it("returns null when there is no errors array", () => {
    expect(extractGraphQLErrorMessage({ data: { products: { resultList: [] } } })).toBeNull();
  });

  it("returns null for a non-object response", () => {
    expect(extractGraphQLErrorMessage(null)).toBeNull();
    expect(extractGraphQLErrorMessage("not an object")).toBeNull();
  });

  it("falls back to a generic message when errors exist but have no message field", () => {
    expect(extractGraphQLErrorMessage({ errors: [{ code: "FORBIDDEN" }] })).toBe("CJ GraphQL request returned an error.");
  });
});
