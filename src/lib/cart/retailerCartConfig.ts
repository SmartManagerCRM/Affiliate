import type { Json } from "@/lib/database.types";
import type { CartLinkType } from "@/lib/types";

export const CART_LINK_TYPES: readonly CartLinkType[] = [
  "none",
  "static",
  "dynamic",
  "platform_specific",
  "api",
  "custom",
];

/** Only these strategies store free-form JSON in cart_config today. */
export const JSON_CONFIG_CART_LINK_TYPES: readonly CartLinkType[] = [
  "dynamic",
  "platform_specific",
  "api",
  "custom",
];

export type RetailerCartConfigInput = {
  supportsMultiProductCart: boolean;
  cartLinkType: string;
  cartLinkTemplate: string;
  cartConfigJson: string;
};

export type RetailerCartConfigResult =
  | {
      ok: true;
      cartLinkType: CartLinkType;
      cartLinkTemplate: string | null;
      cartConfig: Json;
    }
  | { ok: false; error: string };

/**
 * Parses and validates an admin's retailer cart-config submission. Mirrors
 * the retailers_multi_cart_requires_strategy DB CHECK constraint
 * (supports_multi_product_cart implies cart_link_type <> 'none') and the
 * cart_link_type enum check, so a bad submission comes back as a clear
 * message here rather than a raw Postgres error — the DB constraint stays
 * the authoritative backstop either way, since it's a defense-in-depth
 * duplicate of the same rule, not a replacement for it.
 */
export function parseRetailerCartConfig(input: RetailerCartConfigInput): RetailerCartConfigResult {
  const cartLinkType: CartLinkType = CART_LINK_TYPES.includes(input.cartLinkType as CartLinkType)
    ? (input.cartLinkType as CartLinkType)
    : "none";

  let cartConfig: Json = {};
  if (JSON_CONFIG_CART_LINK_TYPES.includes(cartLinkType) && input.cartConfigJson.trim()) {
    try {
      cartConfig = JSON.parse(input.cartConfigJson);
    } catch {
      return { ok: false, error: "Cart configuration must be valid JSON." };
    }
  }

  if (input.supportsMultiProductCart && cartLinkType === "none") {
    return {
      ok: false,
      error: "Supports multi-product cart requires a cart strategy other than 'None'.",
    };
  }

  const cartLinkTemplate = input.cartLinkTemplate.trim();
  if (cartLinkType === "static" && cartLinkTemplate) {
    try {
      const url = new URL(cartLinkTemplate);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("not http(s)");
    } catch {
      return { ok: false, error: "Cart link template must be a valid http(s) URL." };
    }
  }

  return {
    ok: true,
    cartLinkType,
    cartLinkTemplate: cartLinkType === "static" && cartLinkTemplate ? cartLinkTemplate : null,
    cartConfig: JSON_CONFIG_CART_LINK_TYPES.includes(cartLinkType) ? cartConfig : {},
  };
}
