import { describe, it, expect } from "vitest";
import { validateClassificationResult } from "./schema";
import type { ClassificationTaxonomy } from "./classificationStore";

const TAXONOMY: ClassificationTaxonomy = {
  activities: [
    { id: "act-coffee", name: "Coffee" },
    { id: "act-fitness", name: "Fitness" },
  ],
  categories: [
    { id: "cat-machines", name: "Espresso Machines", activityId: "act-coffee" },
    { id: "cat-beans", name: "Coffee Beans", activityId: "act-coffee" },
    { id: "cat-yoga", name: "Yoga Mats", activityId: "act-fitness" },
  ],
};

function valid(overrides: Record<string, unknown> = {}) {
  return {
    activityId: "act-coffee",
    categoryIds: ["cat-machines"],
    countries: ["AE"],
    confidence: 0.9,
    reason: "It's an espresso machine.",
    ...overrides,
  };
}

describe("validateClassificationResult", () => {
  it("accepts a fully valid response", () => {
    const result = validateClassificationResult(valid(), TAXONOMY);
    expect(result.valid).toBe(true);
  });

  it("accepts GLOBAL as a country", () => {
    const result = validateClassificationResult(valid({ countries: ["GLOBAL"] }), TAXONOMY);
    expect(result.valid).toBe(true);
  });

  it("accepts multiple valid categories under the same activity", () => {
    const result = validateClassificationResult(valid({ categoryIds: ["cat-machines", "cat-beans"] }), TAXONOMY);
    expect(result.valid).toBe(true);
  });

  it("accepts an empty categoryIds array", () => {
    const result = validateClassificationResult(valid({ categoryIds: [] }), TAXONOMY);
    expect(result.valid).toBe(true);
  });

  it("rejects a non-object response", () => {
    expect(validateClassificationResult(null, TAXONOMY).valid).toBe(false);
    expect(validateClassificationResult("a string", TAXONOMY).valid).toBe(false);
    expect(validateClassificationResult(42, TAXONOMY).valid).toBe(false);
    expect(validateClassificationResult(undefined, TAXONOMY).valid).toBe(false);
  });

  it("rejects a missing activityId", () => {
    const result = validateClassificationResult(valid({ activityId: undefined }), TAXONOMY);
    expect(result.valid).toBe(false);
  });

  it("rejects an activityId that is not a real activity — never lets the AI invent one", () => {
    const result = validateClassificationResult(valid({ activityId: "act-made-up" }), TAXONOMY);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorMessage).toContain("act-made-up");
  });

  it("rejects categoryIds that is not an array", () => {
    const result = validateClassificationResult(valid({ categoryIds: "cat-machines" }), TAXONOMY);
    expect(result.valid).toBe(false);
  });

  it("rejects a categoryId that is not a real category", () => {
    const result = validateClassificationResult(valid({ categoryIds: ["cat-made-up"] }), TAXONOMY);
    expect(result.valid).toBe(false);
  });

  it("rejects a categoryId that belongs to a different activity", () => {
    const result = validateClassificationResult(valid({ categoryIds: ["cat-yoga"] }), TAXONOMY);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorMessage).toContain("does not belong");
  });

  it("rejects an empty countries array", () => {
    const result = validateClassificationResult(valid({ countries: [] }), TAXONOMY);
    expect(result.valid).toBe(false);
  });

  it("rejects an invalid country code", () => {
    expect(validateClassificationResult(valid({ countries: ["USA"] }), TAXONOMY).valid).toBe(false);
    expect(validateClassificationResult(valid({ countries: ["us"] }), TAXONOMY).valid).toBe(false);
    expect(validateClassificationResult(valid({ countries: ["Worldwide"] }), TAXONOMY).valid).toBe(false);
  });

  it("rejects a confidence outside 0-1", () => {
    expect(validateClassificationResult(valid({ confidence: 1.5 }), TAXONOMY).valid).toBe(false);
    expect(validateClassificationResult(valid({ confidence: -0.1 }), TAXONOMY).valid).toBe(false);
  });

  it("rejects a non-numeric confidence", () => {
    expect(validateClassificationResult(valid({ confidence: "high" }), TAXONOMY).valid).toBe(false);
    expect(validateClassificationResult(valid({ confidence: NaN }), TAXONOMY).valid).toBe(false);
  });

  it("accepts boundary confidences 0 and 1", () => {
    expect(validateClassificationResult(valid({ confidence: 0 }), TAXONOMY).valid).toBe(true);
    expect(validateClassificationResult(valid({ confidence: 1 }), TAXONOMY).valid).toBe(true);
  });

  it("rejects a missing or blank reason", () => {
    expect(validateClassificationResult(valid({ reason: "" }), TAXONOMY).valid).toBe(false);
    expect(validateClassificationResult(valid({ reason: "   " }), TAXONOMY).valid).toBe(false);
    expect(validateClassificationResult(valid({ reason: undefined }), TAXONOMY).valid).toBe(false);
  });

  it("rejects an excessively long reason", () => {
    const result = validateClassificationResult(valid({ reason: "x".repeat(2001) }), TAXONOMY);
    expect(result.valid).toBe(false);
  });

  it("trims the reason in the returned result", () => {
    const result = validateClassificationResult(valid({ reason: "  trimmed  " }), TAXONOMY);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.result.reason).toBe("trimmed");
  });
});
