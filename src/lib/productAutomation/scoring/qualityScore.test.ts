import { describe, it, expect } from "vitest";
import { computeQualityScore, QUALITY_SCORE_WEIGHTS } from "./qualityScore";
import type { NormalizedProduct } from "../types";

function product(overrides: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    externalProductId: "ext-1",
    name: "Test Product",
    images: [],
    raw: {},
    offers: [],
    ...overrides,
  };
}

describe("computeQualityScore", () => {
  it("sums to 100 when every factor is present and dedup is clean", () => {
    const p = product({
      images: ["https://example.test/img.jpg"],
      description: "x".repeat(50),
      brand: "Acme",
      gtin: "0012345678905",
    });
    const result = computeQualityScore(p, "unique");
    expect(result.score).toBe(100);
    expect(result.factors).toEqual({
      hasImage: true,
      hasDescription: true,
      hasBrand: true,
      hasIdentifier: true,
      isDedupClean: true,
    });
  });

  it("scores 0 when nothing is present and dedup needs review", () => {
    const result = computeQualityScore(product(), "needs_review");
    expect(result.score).toBe(0);
  });

  it("the weights sum to 100", () => {
    const total = Object.values(QUALITY_SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("credits an image", () => {
    const result = computeQualityScore(product({ images: ["https://example.test/img.jpg"] }), "needs_review");
    expect(result.score).toBe(QUALITY_SCORE_WEIGHTS.image);
    expect(result.factors.hasImage).toBe(true);
  });

  it("credits a sufficiently long description", () => {
    const result = computeQualityScore(product({ description: "x".repeat(40) }), "needs_review");
    expect(result.factors.hasDescription).toBe(true);
    expect(result.score).toBe(QUALITY_SCORE_WEIGHTS.description);
  });

  it("does not credit a too-short description", () => {
    const result = computeQualityScore(product({ description: "short" }), "needs_review");
    expect(result.factors.hasDescription).toBe(false);
    expect(result.score).toBe(0);
  });

  it("does not credit a blank description", () => {
    const result = computeQualityScore(product({ description: "   " }), "needs_review");
    expect(result.factors.hasDescription).toBe(false);
  });

  it("credits a brand", () => {
    const result = computeQualityScore(product({ brand: "Acme" }), "needs_review");
    expect(result.score).toBe(QUALITY_SCORE_WEIGHTS.brand);
  });

  it("credits a gtin as an identifier", () => {
    const result = computeQualityScore(product({ gtin: "123" }), "needs_review");
    expect(result.factors.hasIdentifier).toBe(true);
    expect(result.score).toBe(QUALITY_SCORE_WEIGHTS.identifier);
  });

  it("credits a sku as an identifier", () => {
    const result = computeQualityScore(product({ sku: "SKU-1" }), "needs_review");
    expect(result.factors.hasIdentifier).toBe(true);
  });

  it("does not double-credit having both gtin and sku", () => {
    const result = computeQualityScore(product({ gtin: "123", sku: "SKU-1" }), "needs_review");
    expect(result.score).toBe(QUALITY_SCORE_WEIGHTS.identifier);
  });

  it("credits dedup cleanliness only when status is unique", () => {
    const clean = computeQualityScore(product(), "unique");
    const dirty = computeQualityScore(product(), "needs_review");
    expect(clean.score).toBe(QUALITY_SCORE_WEIGHTS.dedupClean);
    expect(dirty.score).toBe(0);
  });

  it("never returns a score outside 0-100", () => {
    const richest = product({
      images: ["a"],
      description: "x".repeat(100),
      brand: "Acme",
      gtin: "123",
      sku: "SKU-1",
    });
    const result = computeQualityScore(richest, "unique");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
