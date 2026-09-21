import { describe, it, expect } from "vitest";
import { normalizeProductRow, parseProductsFeedPage } from "./products";

const FULL_ROW = {
  id: "prod-1",
  title: "Wireless Headphones",
  description: "Noise-cancelling over-ear headphones",
  brand: "Acme Audio",
  advertiserName: "Acme Store",
  targetCountry: "US",
  imageLink: "https://img.example/main.jpg",
  additionalImageLink: ["https://img.example/2.jpg", "https://img.example/3.jpg"],
  isDeleted: false,
  price: { amount: 129.99, currency: "USD" },
  salePrice: { amount: 99.99, currency: "USD" },
  link: "https://acme.example/products/headphones", // must NEVER be used as affiliateUrl
  linkCode: { clickUrl: "https://www.anrdoezrs.net/click-123-456?url=..." },
};

describe("normalizeProductRow", () => {
  it("maps a full row to a NormalizedProduct with the CJ tracking URL as affiliateUrl, never the raw link", () => {
    const product = normalizeProductRow(FULL_ROW);

    expect(product.externalProductId).toBe("prod-1");
    expect(product.name).toBe("Wireless Headphones");
    expect(product.brand).toBe("Acme Audio");
    expect(product.description).toBe("Noise-cancelling over-ear headphones");
    expect(product.images).toEqual(["https://img.example/main.jpg", "https://img.example/2.jpg", "https://img.example/3.jpg"]);
    expect(product.sku).toBeNull();
    expect(product.gtin).toBeNull();

    const offer = product.offers[0];
    expect(offer.affiliateUrl).toBe("https://www.anrdoezrs.net/click-123-456?url=...");
    expect(offer.affiliateUrl).not.toBe(FULL_ROW.link);
    expect(offer.price).toBe(99.99);
    expect(offer.originalPrice).toBe(129.99);
    expect(offer.currency).toBe("USD");
    expect(offer.availability).toBe("in_stock");
    expect(offer.retailerName).toBe("Acme Store");
    expect(offer.country).toBe("US");
  });

  it("uses price as the current price and leaves originalPrice null when there is no salePrice", () => {
    const row = { ...FULL_ROW, salePrice: null };
    const product = normalizeProductRow(row);

    expect(product.offers[0].price).toBe(129.99);
    expect(product.offers[0].originalPrice).toBeNull();
  });

  it("maps isDeleted: true to out_of_stock availability", () => {
    const product = normalizeProductRow({ ...FULL_ROW, isDeleted: true });
    expect(product.offers[0].availability).toBe("out_of_stock");
  });

  it("defaults to in_stock when isDeleted is absent", () => {
    const { isDeleted: _drop, ...row } = FULL_ROW;
    void _drop;
    const product = normalizeProductRow(row);
    expect(product.offers[0].availability).toBe("in_stock");
  });

  it("leaves affiliateUrl empty when linkCode/clickUrl is missing, rather than falling back to the raw link", () => {
    const { linkCode: _drop, ...row } = FULL_ROW;
    void _drop;
    const product = normalizeProductRow(row);
    expect(product.offers[0].affiliateUrl).toBe("");
  });

  it("never throws on null, a string, or an unrecognized shape — degrades to an empty/invalid product instead", () => {
    for (const bad of [null, undefined, "unexpected", 42, []]) {
      const product = normalizeProductRow(bad);
      expect(product.externalProductId).toBe("");
      expect(product.offers).toHaveLength(1);
    }
  });

  it("filters out non-string entries from additionalImageLink defensively", () => {
    const product = normalizeProductRow({ ...FULL_ROW, additionalImageLink: ["https://img.example/ok.jpg", null, 42, ""] });
    expect(product.images).toEqual(["https://img.example/main.jpg", "https://img.example/ok.jpg"]);
  });
});

describe("parseProductsFeedPage", () => {
  it("parses the documented data.products.resultList shape", () => {
    const response = { data: { products: { totalCount: 250, resultList: [FULL_ROW] } } };
    const page = parseProductsFeedPage(response);
    expect(page.totalCount).toBe(250);
    expect(page.products).toHaveLength(1);
    expect(page.products[0].externalProductId).toBe("prod-1");
  });

  it("tolerates items in place of resultList", () => {
    expect(parseProductsFeedPage({ data: { products: { items: [FULL_ROW] } } }).products).toHaveLength(1);
  });

  it("returns an empty page for an empty result set", () => {
    expect(parseProductsFeedPage({ data: { products: { totalCount: 0, resultList: [] } } })).toEqual({ products: [], totalCount: 0 });
  });

  it("returns an empty page rather than throwing for null, a string, or an unrecognized shape", () => {
    expect(parseProductsFeedPage(null)).toEqual({ products: [], totalCount: null });
    expect(parseProductsFeedPage("unexpected")).toEqual({ products: [], totalCount: null });
    expect(parseProductsFeedPage({ unexpected: "shape" })).toEqual({ products: [], totalCount: null });
  });
});
