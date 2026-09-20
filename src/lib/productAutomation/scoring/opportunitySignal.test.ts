import { describe, it, expect } from "vitest";
import { computeOpportunitySignal } from "./opportunitySignal";

describe("computeOpportunitySignal", () => {
  it("returns insufficient_data with a reason when there is no matched product at all", () => {
    const result = computeOpportunitySignal({
      candidatePrice: 10,
      candidateCurrency: "USD",
      matchedProductOffers: null,
    });
    expect(result.status).toBe("insufficient_data");
    if (result.status === "insufficient_data") expect(result.reason).toBeTruthy();
  });

  it("returns insufficient_data when the matched product has zero offers", () => {
    const result = computeOpportunitySignal({
      candidatePrice: 10,
      candidateCurrency: "USD",
      matchedProductOffers: [],
    });
    expect(result.status).toBe("insufficient_data");
  });

  it("returns insufficient_data when the candidate has no price", () => {
    const result = computeOpportunitySignal({
      candidatePrice: null,
      candidateCurrency: "USD",
      matchedProductOffers: [{ price: 10, currency: "USD" }],
    });
    expect(result.status).toBe("insufficient_data");
  });

  it("returns insufficient_data when the candidate price is not finite", () => {
    const result = computeOpportunitySignal({
      candidatePrice: NaN,
      candidateCurrency: "USD",
      matchedProductOffers: [{ price: 10, currency: "USD" }],
    });
    expect(result.status).toBe("insufficient_data");
  });

  it("returns insufficient_data when the candidate has no currency", () => {
    const result = computeOpportunitySignal({
      candidatePrice: 10,
      candidateCurrency: null,
      matchedProductOffers: [{ price: 10, currency: "USD" }],
    });
    expect(result.status).toBe("insufficient_data");
  });

  it("returns insufficient_data when no matched offer shares the candidate's currency", () => {
    const result = computeOpportunitySignal({
      candidatePrice: 10,
      candidateCurrency: "USD",
      matchedProductOffers: [{ price: 10, currency: "EUR" }],
    });
    expect(result.status).toBe("insufficient_data");
  });

  it("reports 'cheaper' with a correctly-computed real percentage", () => {
    const result = computeOpportunitySignal({
      candidatePrice: 15,
      candidateCurrency: "USD",
      matchedProductOffers: [{ price: 20, currency: "USD" }],
    });
    expect(result).toEqual({
      status: "cheaper",
      percentBelowExisting: 25,
      existingPrice: 20,
      candidatePrice: 15,
      currency: "USD",
    });
  });

  it("reports 'not_cheaper' when the candidate price equals the existing price", () => {
    const result = computeOpportunitySignal({
      candidatePrice: 20,
      candidateCurrency: "USD",
      matchedProductOffers: [{ price: 20, currency: "USD" }],
    });
    expect(result.status).toBe("not_cheaper");
  });

  it("reports 'not_cheaper' when the candidate price is higher", () => {
    const result = computeOpportunitySignal({
      candidatePrice: 25,
      candidateCurrency: "USD",
      matchedProductOffers: [{ price: 20, currency: "USD" }],
    });
    expect(result.status).toBe("not_cheaper");
  });

  it("compares against the lowest same-currency offer when several exist", () => {
    const result = computeOpportunitySignal({
      candidatePrice: 12,
      candidateCurrency: "USD",
      matchedProductOffers: [
        { price: 30, currency: "USD" },
        { price: 15, currency: "USD" },
        { price: 100, currency: "EUR" },
      ],
    });
    expect(result).toMatchObject({ status: "cheaper", existingPrice: 15 });
  });

  it("ignores offers in a different currency even when a same-currency one also exists", () => {
    const result = computeOpportunitySignal({
      candidatePrice: 12,
      candidateCurrency: "USD",
      matchedProductOffers: [
        { price: 5, currency: "EUR" },
        { price: 20, currency: "USD" },
      ],
    });
    expect(result).toMatchObject({ status: "cheaper", existingPrice: 20, currency: "USD" });
  });

  it("rounds the percentage to one decimal place", () => {
    const result = computeOpportunitySignal({
      candidatePrice: 9,
      candidateCurrency: "USD",
      matchedProductOffers: [{ price: 10, currency: "USD" }],
    });
    expect(result).toMatchObject({ status: "cheaper", percentBelowExisting: 10 });
  });
});
