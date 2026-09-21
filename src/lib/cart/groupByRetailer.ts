import type { CartItemView, CartLinkType } from "@/lib/types";

export type CartRetailerGroup = {
  retailerId: string;
  retailerName: string;
  retailerSlug: string;
  retailerLogo: string | null;
  supportsMultiProductCart: boolean;
  cartLinkType: CartLinkType;
  items: CartItemView[];
};

/**
 * Groups cart items by retailer. cart_get_items() orders items by
 * created_at asc, and Map preserves insertion order, so groups come out
 * ordered by when their first item was added.
 */
export function groupCartItemsByRetailer(items: CartItemView[]): CartRetailerGroup[] {
  const groups = new Map<string, CartRetailerGroup>();

  for (const item of items) {
    const existing = groups.get(item.retailer_id);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(item.retailer_id, {
      retailerId: item.retailer_id,
      retailerName: item.retailer_name,
      retailerSlug: item.retailer_slug,
      retailerLogo: item.retailer_logo || null,
      supportsMultiProductCart: item.supports_multi_product_cart,
      cartLinkType: item.cart_link_type as CartLinkType,
      items: [item],
    });
  }

  return Array.from(groups.values());
}

export type RetailerCartStrategy = "multi_cart" | "individual";

/**
 * Whether a retailer group can offer a real, documented multi-product cart
 * link. Driven only by the retailer's own admin-configured capability
 * fields (supports_multi_product_cart / cart_link_type) — never inferred or
 * fabricated. Any retailer without a real, configured strategy falls back
 * to shopping items individually, each through its own /go/ link.
 */
export function getRetailerCartStrategy(
  group: Pick<CartRetailerGroup, "supportsMultiProductCart" | "cartLinkType">
): RetailerCartStrategy {
  if (group.supportsMultiProductCart && group.cartLinkType !== "none") {
    return "multi_cart";
  }
  return "individual";
}

/** The first item in the group that's still available to shop, if any. */
export function firstShoppableItem(
  group: Pick<CartRetailerGroup, "items">
): CartItemView | null {
  return group.items.find((item) => item.is_available) ?? null;
}
