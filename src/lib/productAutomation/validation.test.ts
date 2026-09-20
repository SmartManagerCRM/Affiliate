import { describe, it, expect } from "vitest";
import { validateNormalizedProduct } from "./validation";
import type { NormalizedProduct } from "./types";

function baseProduct(overrides: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    externalProductId: "ext-1",
    name: "Test Product",
    images: ["https://example.test/img.jpg"],
    raw: { id: "ext-1" },
    offers: [
      {
        externalOfferId: "ext-1-offer",
        price: 19.99,
        currency: "USD",
        availability: "in_stock",
        affiliateUrl: "https://example.test/go/ext-1",
        retailerName: "Retailer",
      },
    ],
    ...overrides,
  };
}

describe("validateNormalizedProduct", () => {
  it("accepts a fully valid product", () => {
    expect(validateNormalizedProduct(baseProduct())).toEqual({ valid: true });
  });

  it("accepts a valid product with no images", () => {
    const product = baseProduct({ images: [] });
    expect(validateNormalizedProduct(product)).toEqual({ valid: true });
  });

  it("rejects a product with no external id", () => {
    const product = baseProduct({ externalProductId: "" });
    const result = validateNormalizedProduct(product);
    expect(result).toMatchObject({ valid: false, errorType: "missing_external_id" });
  });

  it("rejects a product with a blank external id", () => {
    const product = baseProduct({ externalProductId: "   " });
    const result = validateNormalizedProduct(product);
    expect(result).toMatchObject({ valid: false, errorType: "missing_external_id" });
  });

  it("rejects a product with no name", () => {
    const product = baseProduct({ name: "" });
    const result = validateNormalizedProduct(product);
    expect(result).toMatchObject({ valid: false, errorType: "missing_name" });
  });

  it("rejects a product with no offers", () => {
    const product = baseProduct({ offers: [] });
    const result = validateNormalizedProduct(product);
    expect(result).toMatchObject({ valid: false, errorType: "missing_offer" });
  });

  it("rejects an offer with a zero price", () => {
    const product = baseProduct();
    product.offers[0].price = 0;
    const result = validateNormalizedProduct(product);
    expect(result).toMatchObject({ valid: false, errorType: "missing_price" });
  });

  it("rejects an offer with a negative price", () => {
    const product = baseProduct();
    product.offers[0].price = -5;
    const result = validateNormalizedProduct(product);
    expect(result).toMatchObject({ valid: false, errorType: "missing_price" });
  });

  it("rejects an offer with a NaN price", () => {
    const product = baseProduct();
    product.offers[0].price = NaN;
    const result = validateNormalizedProduct(product);
    expect(result).toMatchObject({ valid: false, errorType: "missing_price" });
  });

  it("rejects an offer with no currency", () => {
    const product = baseProduct();
    product.offers[0].currency = "";
    const result = validateNormalizedProduct(product);
    expect(result).toMatchObject({ valid: false, errorType: "missing_currency" });
  });

  it("rejects an offer with no affiliate URL", () => {
    const product = baseProduct();
    product.offers[0].affiliateUrl = "";
    const result = validateNormalizedProduct(product);
    expect(result).toMatchObject({ valid: false, errorType: "missing_affiliate_url" });
  });
});
