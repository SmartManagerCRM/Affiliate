import { describe, it, expect } from "vitest";
import {
  normalizeNameForMatch,
  extractIdentitySignals,
  scoreIdentityMatch,
  pickBestMatch,
  MIN_REVIEW_CONFIDENCE,
} from "./dedup";
import type { NormalizedProduct } from "./types";

function product(overrides: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    externalProductId: "ext-1",
    name: "Widget Pro",
    images: [],
    raw: {},
    offers: [],
    ...overrides,
  };
}

describe("normalizeNameForMatch", () => {
  it("lowercases and trims", () => {
    expect(normalizeNameForMatch("  Widget Pro  ")).toBe("widget pro");
  });

  it("strips punctuation", () => {
    expect(normalizeNameForMatch("Widget Pro, 2.0 (Black)")).toBe("widget pro 2 0 black");
  });

  it("strips accents", () => {
    expect(normalizeNameForMatch("Café Latté Maker")).toBe("cafe latte maker");
  });

  it("collapses repeated whitespace", () => {
    expect(normalizeNameForMatch("Widget   Pro")).toBe("widget pro");
  });

  it("produces the same result for equivalent names with different formatting", () => {
    expect(normalizeNameForMatch("Widget-Pro")).toBe(normalizeNameForMatch("Widget Pro"));
  });
});

describe("extractIdentitySignals", () => {
  it("lowercases and trims gtin/sku/brand/model", () => {
    const p = product({ gtin: " 0012345 ", sku: " SKU-1 ", brand: " Acme ", model: " X100 " });
    const signals = extractIdentitySignals(p);
    expect(signals).toEqual({
      gtin: "0012345",
      sku: "sku-1",
      brand: "acme",
      model: "x100",
      normalizedName: "widget pro",
    });
  });

  it("treats blank/missing fields as null", () => {
    const p = product({ gtin: "", sku: null, brand: undefined });
    const signals = extractIdentitySignals(p);
    expect(signals.gtin).toBeNull();
    expect(signals.sku).toBeNull();
    expect(signals.brand).toBeNull();
    expect(signals.model).toBeNull();
  });
});

describe("scoreIdentityMatch", () => {
  const empty = { gtin: null, sku: null, brand: null, model: null, normalizedName: "" };

  it("scores an exact gtin match at 100 regardless of anything else", () => {
    const a = { ...empty, gtin: "0012345", normalizedName: "totally different name a" };
    const b = { ...empty, gtin: "0012345", normalizedName: "totally different name b" };
    expect(scoreIdentityMatch(a, b)).toEqual({ confidence: 100, signals: ["gtin"] });
  });

  it("scores sku + brand match at 90", () => {
    const a = { ...empty, sku: "sku-1", brand: "acme", normalizedName: "a" };
    const b = { ...empty, sku: "sku-1", brand: "acme", normalizedName: "b" };
    const result = scoreIdentityMatch(a, b);
    expect(result.confidence).toBe(90);
    expect(result.signals.sort()).toEqual(["brand", "sku"]);
  });

  it("scores sku match alone (no brand agreement) at 70", () => {
    const a = { ...empty, sku: "sku-1", brand: "acme" };
    const b = { ...empty, sku: "sku-1", brand: "other" };
    const result = scoreIdentityMatch(a, b);
    expect(result.confidence).toBe(70);
    expect(result.signals).toEqual(["sku"]);
  });

  it("scores model + brand match at 80", () => {
    const a = { ...empty, model: "x100", brand: "acme" };
    const b = { ...empty, model: "x100", brand: "acme" };
    const result = scoreIdentityMatch(a, b);
    expect(result.confidence).toBe(80);
    expect(result.signals.sort()).toEqual(["brand", "model"]);
  });

  it("does not score a model match without brand agreement", () => {
    const a = { ...empty, model: "x100", brand: "acme" };
    const b = { ...empty, model: "x100", brand: "other" };
    expect(scoreIdentityMatch(a, b).confidence).toBe(0);
  });

  it("scores normalized-name + brand match at 65", () => {
    const a = { ...empty, normalizedName: "widget pro", brand: "acme" };
    const b = { ...empty, normalizedName: "widget pro", brand: "acme" };
    const result = scoreIdentityMatch(a, b);
    expect(result.confidence).toBe(65);
    expect(result.signals.sort()).toEqual(["brand", "name"]);
  });

  it("scores normalized-name match alone at 45", () => {
    const a = { ...empty, normalizedName: "widget pro" };
    const b = { ...empty, normalizedName: "widget pro" };
    const result = scoreIdentityMatch(a, b);
    expect(result.confidence).toBe(45);
    expect(result.signals).toEqual(["name"]);
  });

  it("scores completely unrelated products at 0", () => {
    const a = { ...empty, normalizedName: "widget pro", brand: "acme" };
    const b = { ...empty, normalizedName: "gadget max", brand: "other" };
    expect(scoreIdentityMatch(a, b).confidence).toBe(0);
  });

  it("takes the highest applicable score, not the first rule matched", () => {
    // sku+brand (90) AND name+brand (65) both apply — expect 90, not 65.
    const a = { ...empty, sku: "sku-1", brand: "acme", normalizedName: "widget pro" };
    const b = { ...empty, sku: "sku-1", brand: "acme", normalizedName: "widget pro" };
    expect(scoreIdentityMatch(a, b).confidence).toBe(90);
  });

  it("never scores when both sides are empty", () => {
    expect(scoreIdentityMatch(empty, empty).confidence).toBe(0);
  });

  it("MIN_REVIEW_CONFIDENCE is at or below every rule's score, so every defined match qualifies for review", () => {
    expect(MIN_REVIEW_CONFIDENCE).toBeLessThanOrEqual(45);
  });
});

describe("pickBestMatch", () => {
  const target = { gtin: "0012345", sku: null, brand: null, model: null, normalizedName: "widget pro" };

  it("returns null when no candidate matches", () => {
    const candidates = [
      { ref: "a", signals: { gtin: "different", sku: null, brand: null, model: null, normalizedName: "gadget" } },
    ];
    expect(pickBestMatch(target, candidates)).toBeNull();
  });

  it("returns the single matching candidate", () => {
    const candidates = [
      { ref: "a", signals: { gtin: "0012345", sku: null, brand: null, model: null, normalizedName: "x" } },
    ];
    const best = pickBestMatch(target, candidates);
    expect(best?.ref).toBe("a");
    expect(best?.confidence).toBe(100);
  });

  it("returns the highest-confidence candidate among several", () => {
    const candidates = [
      { ref: "low", signals: { gtin: null, sku: null, brand: null, model: null, normalizedName: "widget pro" } },
      { ref: "high", signals: { gtin: "0012345", sku: null, brand: null, model: null, normalizedName: "z" } },
    ];
    const best = pickBestMatch(target, candidates);
    expect(best?.ref).toBe("high");
    expect(best?.confidence).toBe(100);
  });

  it("returns null for an empty candidate list", () => {
    expect(pickBestMatch(target, [])).toBeNull();
  });
});
