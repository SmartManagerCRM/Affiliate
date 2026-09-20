import type { NormalizedProduct } from "./types";

export type ValidationResult =
  | { valid: true }
  | { valid: false; errorType: string; errorMessage: string };

/**
 * The minimum bar for a normalized product to be worth staging as a
 * pending import (a product_import_sources row). Nothing here rejects on
 * missing images or descriptions — those are data-quality concerns for
 * scoring (Phase 5), not import-time hard failures. A product is only
 * rejected when it's missing something the catalog schema requires.
 */
export function validateNormalizedProduct(product: NormalizedProduct): ValidationResult {
  if (!product.externalProductId?.trim()) {
    return { valid: false, errorType: "missing_external_id", errorMessage: "Product has no external id." };
  }

  if (!product.name?.trim()) {
    return {
      valid: false,
      errorType: "missing_name",
      errorMessage: `Product ${product.externalProductId} has no name.`,
    };
  }

  if (product.offers.length === 0) {
    return {
      valid: false,
      errorType: "missing_offer",
      errorMessage: `Product ${product.externalProductId} has no offers.`,
    };
  }

  const offer = product.offers[0];

  if (!offer.price || offer.price <= 0 || Number.isNaN(offer.price)) {
    return {
      valid: false,
      errorType: "missing_price",
      errorMessage: `Product ${product.externalProductId} offer has no valid price.`,
    };
  }

  if (!offer.currency?.trim()) {
    return {
      valid: false,
      errorType: "missing_currency",
      errorMessage: `Product ${product.externalProductId} offer has no currency.`,
    };
  }

  if (!offer.affiliateUrl?.trim()) {
    return {
      valid: false,
      errorType: "missing_affiliate_url",
      errorMessage: `Product ${product.externalProductId} offer has no affiliate URL.`,
    };
  }

  return { valid: true };
}
