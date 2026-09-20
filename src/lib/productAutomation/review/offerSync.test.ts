import { describe, it, expect } from "vitest";
import { buildOfferUpdate } from "./offerSync";
import type { OfferSyncFields } from "./offerSync";

function fields(overrides: Partial<OfferSyncFields> = {}): OfferSyncFields {
  return {
    price: 19.99,
    originalPrice: null,
    currency: "USD",
    affiliateUrl: "https://example.test/go/1",
    availability: "in_stock",
    country: null,
    shippingInfo: null,
    commissionRate: null,
    ...overrides,
  };
}

describe("buildOfferUpdate", () => {
  it("maps every field straight through", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const update = buildOfferUpdate(
      fields({
        price: 42,
        originalPrice: 50,
        currency: "EUR",
        affiliateUrl: "https://example.test/go/x",
        country: "FR",
        shippingInfo: "Free shipping",
        commissionRate: 0.05,
      }),
      now
    );
    expect(update).toEqual({
      price: 42,
      original_price: 50,
      currency: "EUR",
      affiliate_url: "https://example.test/go/x",
      availability: "in_stock",
      active: true,
      country: "FR",
      shipping_info: "Free shipping",
      commission_rate: 0.05,
      last_updated: "2026-01-01T00:00:00.000Z",
    });
  });

  it("marks the offer inactive when out_of_stock — but never deletes anything", () => {
    const update = buildOfferUpdate(fields({ availability: "out_of_stock" }));
    expect(update.active).toBe(false);
    expect(update.availability).toBe("out_of_stock");
  });

  it("keeps the offer active for in_stock", () => {
    expect(buildOfferUpdate(fields({ availability: "in_stock" })).active).toBe(true);
  });

  it("keeps the offer active for limited availability", () => {
    expect(buildOfferUpdate(fields({ availability: "limited" })).active).toBe(true);
  });

  it("keeps the offer active for preorder", () => {
    expect(buildOfferUpdate(fields({ availability: "preorder" })).active).toBe(true);
  });

  it("reactivates when availability recovers from out_of_stock", () => {
    // Same pure function, called again with fresh data — proves recovery isn't a special case.
    const stillOut = buildOfferUpdate(fields({ availability: "out_of_stock" }));
    const backInStock = buildOfferUpdate(fields({ availability: "in_stock" }));
    expect(stillOut.active).toBe(false);
    expect(backInStock.active).toBe(true);
  });

  it("uses the current time by default", () => {
    const before = Date.now();
    const update = buildOfferUpdate(fields());
    const after = Date.now();
    const timestamp = new Date(update.last_updated).getTime();
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});
