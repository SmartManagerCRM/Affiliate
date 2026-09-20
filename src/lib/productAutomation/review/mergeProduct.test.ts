import { describe, it, expect } from "vitest";
import { mergeProductFields, resolveTargetProductId } from "./mergeProduct";
import type { ExistingProductFields, IncomingProductFields } from "./mergeProduct";

function existing(overrides: Partial<ExistingProductFields> = {}): ExistingProductFields {
  return { description: null, shortDescription: null, mainImage: null, brandId: null, ...overrides };
}

function incoming(overrides: Partial<IncomingProductFields> = {}): IncomingProductFields {
  return { description: null, shortDescription: null, mainImage: null, brandId: null, ...overrides };
}

describe("mergeProductFields", () => {
  it("fills every field when the existing product has nothing", () => {
    const update = mergeProductFields(
      existing(),
      incoming({ description: "desc", shortDescription: "short", mainImage: "https://x/img.jpg", brandId: "brand-1" })
    );
    expect(update).toEqual({
      description: "desc",
      shortDescription: "short",
      mainImage: "https://x/img.jpg",
      brandId: "brand-1",
    });
  });

  it("never overwrites a non-empty existing description", () => {
    const update = mergeProductFields(
      existing({ description: "curated description" }),
      incoming({ description: "incoming description" })
    );
    expect(update.description).toBeUndefined();
  });

  it("never overwrites a non-empty existing short description", () => {
    const update = mergeProductFields(
      existing({ shortDescription: "curated" }),
      incoming({ shortDescription: "incoming" })
    );
    expect(update.shortDescription).toBeUndefined();
  });

  it("never overwrites an existing main image", () => {
    const update = mergeProductFields(
      existing({ mainImage: "https://x/curated.jpg" }),
      incoming({ mainImage: "https://x/incoming.jpg" })
    );
    expect(update.mainImage).toBeUndefined();
  });

  it("never overwrites an existing brand", () => {
    const update = mergeProductFields(existing({ brandId: "brand-existing" }), incoming({ brandId: "brand-incoming" }));
    expect(update.brandId).toBeUndefined();
  });

  it("treats a whitespace-only existing value as empty and fills it", () => {
    const update = mergeProductFields(existing({ description: "   " }), incoming({ description: "real description" }));
    expect(update.description).toBe("real description");
  });

  it("does not fill from a whitespace-only or missing incoming value", () => {
    const update = mergeProductFields(existing(), incoming({ description: "   " }));
    expect(update.description).toBeUndefined();
  });

  it("trims the value it fills in", () => {
    const update = mergeProductFields(existing(), incoming({ description: "  padded  " }));
    expect(update.description).toBe("padded");
  });

  it("returns an empty object when nothing needs to change", () => {
    const update = mergeProductFields(
      existing({ description: "d", shortDescription: "s", mainImage: "https://x/i.jpg", brandId: "b" }),
      incoming({ description: "other", shortDescription: "other", mainImage: "https://x/other.jpg", brandId: "other" })
    );
    expect(update).toEqual({});
  });

  it("fills each field independently — a mix of empty and non-empty existing fields", () => {
    const update = mergeProductFields(
      existing({ description: "curated", mainImage: null }),
      incoming({ description: "incoming", mainImage: "https://x/img.jpg" })
    );
    expect(update).toEqual({ mainImage: "https://x/img.jpg" });
  });
});

describe("resolveTargetProductId", () => {
  it("prefers the candidate's own already-linked product id above all else", () => {
    const result = resolveTargetProductId({
      ownProductId: "own",
      dedupMatchProductId: "dedup",
      siblingProductId: "sibling",
    });
    expect(result).toBe("own");
  });

  it("falls back to a confident dedup match against a real product", () => {
    const result = resolveTargetProductId({
      ownProductId: null,
      dedupMatchProductId: "dedup",
      siblingProductId: "sibling",
    });
    expect(result).toBe("dedup");
  });

  it("falls back to a sibling candidate's product once that sibling was approved", () => {
    const result = resolveTargetProductId({ ownProductId: null, dedupMatchProductId: null, siblingProductId: "sibling" });
    expect(result).toBe("sibling");
  });

  it("returns null when there is no existing product anywhere in the chain", () => {
    const result = resolveTargetProductId({ ownProductId: null, dedupMatchProductId: null, siblingProductId: null });
    expect(result).toBeNull();
  });
});
