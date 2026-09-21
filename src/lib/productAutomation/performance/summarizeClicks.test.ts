import { describe, it, expect } from "vitest";
import { summarizeAutomationClicks } from "./summarizeClicks";
import type { ClickRow } from "./summarizeClicks";

function click(overrides: Partial<ClickRow> = {}): ClickRow {
  return { productId: "p-1", name: "Product 1", mainImage: null, ...overrides };
}

describe("summarizeAutomationClicks", () => {
  it("reports zero everything when there are no automation products at all", () => {
    const summary = summarizeAutomationClicks([], []);
    expect(summary).toEqual({
      totalClicks: 0,
      automationProductCount: 0,
      productsWithClicks: 0,
      productsWithoutClicks: 0,
      topProducts: [],
    });
  });

  it("reports every automation product as having no data yet when there are zero clicks", () => {
    const summary = summarizeAutomationClicks(["p-1", "p-2", "p-3"], []);
    expect(summary.totalClicks).toBe(0);
    expect(summary.automationProductCount).toBe(3);
    expect(summary.productsWithClicks).toBe(0);
    expect(summary.productsWithoutClicks).toBe(3);
    expect(summary.topProducts).toEqual([]);
  });

  it("counts real clicks per product correctly", () => {
    const clicks = [
      click({ productId: "p-1", name: "Product 1" }),
      click({ productId: "p-1", name: "Product 1" }),
      click({ productId: "p-2", name: "Product 2" }),
    ];
    const summary = summarizeAutomationClicks(["p-1", "p-2"], clicks);
    expect(summary.totalClicks).toBe(3);
    expect(summary.topProducts).toEqual([
      { productId: "p-1", name: "Product 1", mainImage: null, clicks: 2 },
      { productId: "p-2", name: "Product 2", mainImage: null, clicks: 1 },
    ]);
  });

  it("separates products with clicks from products without", () => {
    const clicks = [click({ productId: "p-1" })];
    const summary = summarizeAutomationClicks(["p-1", "p-2", "p-3"], clicks);
    expect(summary.productsWithClicks).toBe(1);
    expect(summary.productsWithoutClicks).toBe(2);
  });

  it("sorts topProducts by click count descending", () => {
    const clicks = [
      click({ productId: "p-1" }),
      click({ productId: "p-2" }),
      click({ productId: "p-2" }),
      click({ productId: "p-2" }),
      click({ productId: "p-3" }),
      click({ productId: "p-3" }),
    ];
    const summary = summarizeAutomationClicks(["p-1", "p-2", "p-3"], clicks);
    expect(summary.topProducts.map((p) => p.productId)).toEqual(["p-2", "p-3", "p-1"]);
  });

  it("never returns a conversion, EPC, or revenue field — only real click-derived counts", () => {
    const summary = summarizeAutomationClicks(["p-1"], [click({ productId: "p-1" })]);
    const keys = Object.keys(summary);
    expect(keys).not.toContain("conversionRate");
    expect(keys).not.toContain("epc");
    expect(keys).not.toContain("revenue");
    expect(keys.sort()).toEqual(
      ["automationProductCount", "productsWithClicks", "productsWithoutClicks", "topProducts", "totalClicks"].sort()
    );
  });

  it("ignores click rows referencing a product outside the given productIds", () => {
    const clicks = [click({ productId: "p-1" }), click({ productId: "p-4" })]; // p-4 not in productIds
    const summary = summarizeAutomationClicks(["p-1", "p-2", "p-3"], clicks);
    // The p-4 click is filtered out entirely rather than counted, since it isn't one of the requested automation products.
    expect(summary.productsWithoutClicks).toBe(2);
    expect(summary.totalClicks).toBe(1);
  });
});
