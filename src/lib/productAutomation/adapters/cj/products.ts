import type { Availability, NormalizedProduct } from "../../types";

/**
 * Defensive normalization for CJ's `products` GraphQL query (Product Search
 * API, ads.api.cj.com/query), this time reading full product records rather
 * than just advertiserId/advertiserName (see joinedAdvertisers.ts for that
 * narrower discovery use). Field names are taken from the same verified
 * schema archive cited there (github.com/api-evangelist/cj-affiliate,
 * captured via live introspection, 2026-08-13) — the `Product` interface's
 * own declared fields, so this only ever selects fields actually confirmed
 * to exist (never a guessed/nonexistent one, which is exactly what broke
 * `publisherQueries.contracts` earlier).
 *
 * BUY-NOW URL — CRITICAL. `Product.link` is documented by CJ itself as
 * "Landing page URL" — the merchant's own, un-tracked destination page, NOT
 * an affiliate link. The actual tracked click URL comes from a different
 * field entirely: `Product.linkCode(pid: ID!).clickUrl`, documented as "The
 * click URL for the product". This adapter NEVER reads `link` into
 * `affiliateUrl` — only `linkCode.clickUrl`. If a row's `linkCode.clickUrl`
 * is missing (e.g. a wrong `pid` — see config.ts's PID caveat), that row's
 * `affiliateUrl` is left empty, which validateNormalizedProduct() then
 * rejects outright (missing_affiliate_url) — never silently falling back to
 * the raw merchant URL.
 *
 * CJ's Product interface has no explicit stock/availability field, so
 * availability is inferred from `isDeleted` (confirmed field) — deleted ->
 * out_of_stock, otherwise in_stock — the same "default to in_stock rather
 * than hide an otherwise-good offer" convention Admitad's feed parser uses
 * for the same reason (see admitad/feedParser.ts). CJ's schema also has no
 * gtin/sku/model field on Product, so those stay null (not guessed).
 *
 * Never throws: a malformed/unexpected row just produces an incomplete
 * NormalizedProduct that validateNormalizedProduct() then rejects with a
 * specific, logged reason — same posture as every other parser in this
 * adapter.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function normalizeProductRow(raw: unknown): NormalizedProduct {
  const obj = asRecord(raw) ?? {};

  const externalProductId = asString(obj.id) ?? "";
  const name = asString(obj.title) ?? "";
  const brand = asString(obj.brand);
  const description = asString(obj.description);
  const advertiserName = asString(obj.advertiserName) ?? "CJ";
  const targetCountry = asString(obj.targetCountry);

  const imageLink = asString(obj.imageLink);
  const additionalImages = asStringArray(obj.additionalImageLink);
  const images = [imageLink, ...additionalImages].filter((v): v is string => Boolean(v));

  const priceInfo = asRecord(obj.price);
  const saleInfo = asRecord(obj.salePrice);
  const basePrice = priceInfo ? asNumber(priceInfo.amount) : undefined;
  const baseCurrency = priceInfo ? asString(priceInfo.currency) : null;
  const saleAmount = saleInfo ? asNumber(saleInfo.amount) : undefined;
  const saleCurrency = saleInfo ? asString(saleInfo.currency) : null;

  // salePrice present -> that's the current selling price and `price` becomes the struck-through original; otherwise `price` alone is the current price.
  const currentPrice = saleAmount !== undefined ? saleAmount : basePrice;
  const originalPrice = saleAmount !== undefined && basePrice !== undefined ? basePrice : null;
  const currency = saleCurrency ?? baseCurrency ?? "";

  const isDeleted = obj.isDeleted === true;
  const availability: Availability = isDeleted ? "out_of_stock" : "in_stock";

  const linkCode = asRecord(obj.linkCode);
  // Deliberately NOT obj.link — see the module doc comment above.
  const affiliateUrl = linkCode ? (asString(linkCode.clickUrl) ?? "") : "";

  return {
    externalProductId,
    name,
    brand,
    sku: null,
    gtin: null,
    model: null,
    description,
    shortDescription: null,
    images,
    raw,
    offers: [
      {
        externalOfferId: externalProductId,
        price: currentPrice ?? NaN,
        originalPrice,
        currency,
        availability,
        affiliateUrl,
        retailerName: advertiserName,
        country: targetCountry,
      },
    ],
  };
}

export type ProductsFeedPage = {
  products: NormalizedProduct[];
  totalCount: number | null;
};

/** GraphQL errors (a top-level `errors` array) are handled by the caller via joinedAdvertisers.ts's extractGraphQLErrorMessage — shared across both CJ queries. */
export function parseProductsFeedPage(raw: unknown): ProductsFeedPage {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  const productsNode = asRecord(data?.products) ?? data;

  if (!productsNode) return { products: [], totalCount: null };

  let items: unknown[] = [];
  const resultList = productsNode.resultList ?? productsNode.items;
  if (Array.isArray(resultList)) {
    items = resultList;
  } else if (Array.isArray(raw)) {
    items = raw;
  }

  return {
    products: items.map(normalizeProductRow),
    totalCount: typeof productsNode.totalCount === "number" && Number.isFinite(productsNode.totalCount) ? productsNode.totalCount : null,
  };
}
