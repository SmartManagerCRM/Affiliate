import type { Availability } from "../types";

/**
 * Pure mapping from a candidate's normalized offer to the fields written
 * to a real `offers` row — shared by approval (Phase 6) and automatic
 * updates (Phase 7) so both apply the exact same "what does availability
 * mean for `active`" rule. Kept separate from any Supabase call so it's
 * unit-testable without a database.
 */

export type OfferSyncFields = {
  price: number;
  originalPrice: number | null;
  currency: string;
  affiliateUrl: string;
  availability: Availability;
  country: string | null;
  shippingInfo: string | null;
  commissionRate: number | null;
};

export type OfferUpdate = {
  price: number;
  original_price: number | null;
  currency: string;
  affiliate_url: string;
  availability: Availability;
  /** Only "out_of_stock" deactivates — "limited"/"preorder"/"in_stock" all stay purchasable.
   * Never a delete: the row (and every historical affiliate_clicks row referencing it) is untouched. */
  active: boolean;
  country: string | null;
  shipping_info: string | null;
  commission_rate: number | null;
  last_updated: string;
};

export function buildOfferUpdate(fields: OfferSyncFields, now: Date = new Date()): OfferUpdate {
  return {
    price: fields.price,
    original_price: fields.originalPrice,
    currency: fields.currency,
    affiliate_url: fields.affiliateUrl,
    availability: fields.availability,
    active: fields.availability !== "out_of_stock",
    country: fields.country,
    shipping_info: fields.shippingInfo,
    commission_rate: fields.commissionRate,
    last_updated: now.toISOString(),
  };
}
