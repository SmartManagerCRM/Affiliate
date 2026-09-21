import { describe, it, expect } from "vitest";
import { buildClassificationPrompt } from "./prompt";
import type { NormalizedProduct } from "../types";
import type { ClassificationTaxonomy } from "./classificationStore";

const TAXONOMY: ClassificationTaxonomy = {
  activities: [{ id: "act-coffee", name: "Coffee" }],
  categories: [{ id: "cat-machines", name: "Espresso Machines", activityId: "act-coffee" }],
};

function product(overrides: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return { externalProductId: "p-1", name: "Espresso Machine", images: [], raw: {}, offers: [], ...overrides };
}

describe("buildClassificationPrompt", () => {
  it("includes every activity and category id/name pair", () => {
    const prompt = buildClassificationPrompt(product(), TAXONOMY);
    expect(prompt).toContain("act-coffee: Coffee");
    expect(prompt).toContain("cat-machines: Espresso Machines (activity: act-coffee)");
  });

  it("includes the product name, and brand/description only when present", () => {
    const withExtras = buildClassificationPrompt(product({ brand: "Acme", description: "A great machine" }), TAXONOMY);
    expect(withExtras).toContain("Product name: Espresso Machine");
    expect(withExtras).toContain("Brand: Acme");
    expect(withExtras).toContain("Description: A great machine");

    const bare = buildClassificationPrompt(product(), TAXONOMY);
    expect(bare).not.toContain("Brand:");
    expect(bare).not.toContain("Description:");
  });

  it("shows (none) for an empty taxonomy rather than an empty section", () => {
    const prompt = buildClassificationPrompt(product(), { activities: [], categories: [] });
    expect(prompt).toContain("(none)");
  });
});
