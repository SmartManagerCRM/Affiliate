import type { Availability, NormalizedProduct } from "../../types";

/**
 * Admitad product feeds are per-advertiser CSV exports whose exact column
 * names vary by advertiser/feed template — there's no single fixed schema
 * to hard-code. This parses generic CSV and maps a set of common column
 * name variants onto our normalized shape defensively (missing/unknown
 * columns degrade gracefully rather than throwing); downstream validation
 * (validateNormalizedProduct) is what actually rejects a row that's missing
 * something required. Confirm the real column names against a sample feed
 * export and extend the alias lists below if needed.
 */

const FIELD_ALIASES = {
  externalProductId: ["product_id", "id", "offer_id", "sku"],
  name: ["name", "title", "product_name"],
  brand: ["brand", "vendor", "manufacturer"],
  sku: ["sku", "vendor_code", "vendorcode", "article"],
  gtin: ["gtin", "ean", "upc", "barcode", "isbn"],
  model: ["model", "model_name", "modelname"],
  description: ["description", "desc"],
  price: ["price", "cost"],
  originalPrice: ["old_price", "original_price", "price_old", "oldprice"],
  currency: ["currency", "currency_id", "currencyid"],
  imageUrl: ["image", "image_url", "picture", "picture_url"],
  affiliateUrl: ["url", "link", "affiliate_url", "deeplink"],
  availability: ["availability", "in_stock", "stock"],
  retailerName: ["shop", "store", "retailer", "advertiser", "shop_name"],
} as const;

function buildLowerKeyMap(row: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const key of Object.keys(row)) map.set(key.toLowerCase(), key);
  return map;
}

function findField(
  row: Record<string, string>,
  lowerKeyMap: Map<string, string>,
  aliases: readonly string[]
): string | undefined {
  for (const alias of aliases) {
    const key = lowerKeyMap.get(alias.toLowerCase());
    if (key !== undefined && row[key]?.trim()) return row[key].trim();
  }
  return undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapAvailability(raw: string | undefined): Availability {
  const value = raw?.toLowerCase() ?? "";
  if (value.includes("preorder") || value.includes("pre-order")) return "preorder";
  if (value.includes("limited")) return "limited";
  if (["no", "false", "0", "out of stock", "outofstock"].includes(value)) return "out_of_stock";
  // Default to in_stock rather than out_of_stock when the field is absent —
  // an unknown availability shouldn't silently hide an otherwise-good offer.
  return "in_stock";
}

/** Maps one already-parsed feed row (header -> value) into our normalized shape. */
export function normalizeFeedRow(row: Record<string, string>): NormalizedProduct {
  const lowerKeyMap = buildLowerKeyMap(row);
  const get = (aliases: readonly string[]) => findField(row, lowerKeyMap, aliases);

  const externalProductId = get(FIELD_ALIASES.externalProductId) ?? "";
  const imageUrl = get(FIELD_ALIASES.imageUrl);
  const price = parseNumber(get(FIELD_ALIASES.price));
  const originalPrice = parseNumber(get(FIELD_ALIASES.originalPrice));

  return {
    externalProductId,
    name: get(FIELD_ALIASES.name) ?? "",
    brand: get(FIELD_ALIASES.brand) ?? null,
    sku: get(FIELD_ALIASES.sku) ?? null,
    gtin: get(FIELD_ALIASES.gtin) ?? null,
    model: get(FIELD_ALIASES.model) ?? null,
    description: get(FIELD_ALIASES.description) ?? null,
    shortDescription: null,
    images: imageUrl ? [imageUrl] : [],
    raw: row,
    offers: [
      {
        externalOfferId: externalProductId,
        price: price ?? NaN,
        originalPrice: originalPrice ?? null,
        currency: get(FIELD_ALIASES.currency) ?? "",
        availability: mapAvailability(get(FIELD_ALIASES.availability)),
        affiliateUrl: get(FIELD_ALIASES.affiliateUrl) ?? "",
        retailerName: get(FIELD_ALIASES.retailerName) ?? "Admitad",
      },
    ],
  };
}

/** Minimal RFC4180-style CSV parser: quoted fields, escaped quotes ("" -> "), CRLF/LF. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/** Parses a full CSV document (header row + data rows) into header-keyed records. */
export function parseCsvFeed(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];

  const header = rows[0];
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, i) => {
      record[key] = row[i] ?? "";
    });
    return record;
  });
}
