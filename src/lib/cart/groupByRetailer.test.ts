import { describe, expect, it } from "vitest";
import {
  groupCartItemsByRetailer,
  getRetailerCartStrategy,
  firstShoppableItem,
} from "@/lib/cart/groupByRetailer";
import type { CartItemView, CartLinkType } from "@/lib/types";

function makeItem(
  overrides: Partial<CartItemView> & { cart_item_id: string; retailer_id: string }
): CartItemView {
  return {
    cart_link_type: "none",
    created_at: "2026-01-01T00:00:00Z",
    currency_at_add: "USD",
    current_availability: "in_stock",
    current_currency: "USD",
    current_original_price: 100,
    current_price: 90,
    is_available: true,
    offer_id: `offer-${overrides.cart_item_id}`,
    price_at_add: 90,
    product_id: `product-${overrides.cart_item_id}`,
    product_main_image: "",
    product_name: `Product ${overrides.cart_item_id}`,
    product_slug: `product-${overrides.cart_item_id}`,
    quantity: 1,
    retailer_logo: "",
    retailer_name: `Retailer ${overrides.retailer_id}`,
    retailer_slug: `retailer-${overrides.retailer_id}`,
    supports_multi_product_cart: false,
    ...overrides,
  };
}

describe("groupCartItemsByRetailer", () => {
  it("groups items by retailer_id, preserving first-seen retailer order", () => {
    const items = [
      makeItem({ cart_item_id: "1", retailer_id: "r1" }),
      makeItem({ cart_item_id: "2", retailer_id: "r2" }),
      makeItem({ cart_item_id: "3", retailer_id: "r1" }),
    ];
    const groups = groupCartItemsByRetailer(items);
    expect(groups.map((g) => g.retailerId)).toEqual(["r1", "r2"]);
    expect(groups[0].items.map((i) => i.cart_item_id)).toEqual(["1", "3"]);
    expect(groups[1].items.map((i) => i.cart_item_id)).toEqual(["2"]);
  });

  it("returns an empty array for an empty cart", () => {
    expect(groupCartItemsByRetailer([])).toEqual([]);
  });

  it("carries the retailer's capability fields from its items", () => {
    const items = [
      makeItem({
        cart_item_id: "1",
        retailer_id: "r1",
        supports_multi_product_cart: true,
        cart_link_type: "static",
      }),
    ];
    const [group] = groupCartItemsByRetailer(items);
    expect(group.supportsMultiProductCart).toBe(true);
    expect(group.cartLinkType).toBe("static");
  });

  it("falls back to null for a missing retailer logo", () => {
    const items = [makeItem({ cart_item_id: "1", retailer_id: "r1", retailer_logo: "" })];
    const [group] = groupCartItemsByRetailer(items);
    expect(group.retailerLogo).toBeNull();
  });
});

describe("getRetailerCartStrategy", () => {
  it("falls back to individual when supports_multi_product_cart is false, regardless of cart_link_type", () => {
    const types: CartLinkType[] = ["none", "static", "dynamic", "platform_specific", "api", "custom"];
    for (const cartLinkType of types) {
      expect(getRetailerCartStrategy({ supportsMultiProductCart: false, cartLinkType })).toBe(
        "individual"
      );
    }
  });

  it("falls back to individual when cart_link_type is 'none', even if supports_multi_product_cart is true", () => {
    expect(
      getRetailerCartStrategy({ supportsMultiProductCart: true, cartLinkType: "none" })
    ).toBe("individual");
  });

  it("uses multi_cart only when both a real strategy is configured and supports_multi_product_cart is true", () => {
    const types: CartLinkType[] = ["static", "dynamic", "platform_specific", "api", "custom"];
    for (const cartLinkType of types) {
      expect(getRetailerCartStrategy({ supportsMultiProductCart: true, cartLinkType })).toBe(
        "multi_cart"
      );
    }
  });
});

describe("firstShoppableItem", () => {
  it("returns the first available item", () => {
    const items = [
      makeItem({ cart_item_id: "1", retailer_id: "r1", is_available: false }),
      makeItem({ cart_item_id: "2", retailer_id: "r1", is_available: true }),
    ];
    expect(firstShoppableItem({ items })?.cart_item_id).toBe("2");
  });

  it("returns null when no item in the group is available", () => {
    const items = [makeItem({ cart_item_id: "1", retailer_id: "r1", is_available: false })];
    expect(firstShoppableItem({ items })).toBeNull();
  });

  it("returns null for an empty group", () => {
    expect(firstShoppableItem({ items: [] })).toBeNull();
  });
});
