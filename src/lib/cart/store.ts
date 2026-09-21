import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type { CartItemView } from "@/lib/types";

/**
 * Thin wrappers around the cart_* SECURITY DEFINER RPCs (see the
 * smart_cart_foundation migration) — the only way this app ever reads or
 * writes shopping_sessions/shopping_cart_items/cart_events. Uses the same
 * cookie-free anon client as every other public read (createPublicClient) —
 * the RPCs themselves are what authenticate a session token, not RLS on
 * these tables (which only grants admins direct SELECT, matching
 * affiliate_clicks' own pattern).
 *
 * Never accepts or returns offers.affiliate_url — the real, live-checked
 * data these need always comes from cart_get_items()'s own join against
 * offers/products, never from a value the browser supplied.
 */

export type AddToCartResult = {
  cartItemId: string;
  quantity: number;
};

export async function addToCart(params: {
  sessionToken: string;
  productId: string;
  offerId: string;
  ref?: string | null;
  quantity?: number;
}): Promise<AddToCartResult> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("cart_add_item", {
    p_session_token: params.sessionToken,
    p_product_id: params.productId,
    p_offer_id: params.offerId,
    p_ref: params.ref ?? undefined,
    p_quantity: params.quantity ?? 1,
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) throw new Error("Add to cart did not return a result.");
  return { cartItemId: row.cart_item_id, quantity: row.quantity };
}

export async function updateCartItemQuantity(params: {
  sessionToken: string;
  cartItemId: string;
  quantity: number;
}): Promise<void> {
  const supabase = createPublicClient();
  const { error } = await supabase.rpc("cart_update_item_quantity", {
    p_session_token: params.sessionToken,
    p_cart_item_id: params.cartItemId,
    p_quantity: params.quantity,
  });
  if (error) throw new Error(error.message);
}

export async function removeCartItem(params: { sessionToken: string; cartItemId: string }): Promise<void> {
  const supabase = createPublicClient();
  const { error } = await supabase.rpc("cart_remove_item", {
    p_session_token: params.sessionToken,
    p_cart_item_id: params.cartItemId,
  });
  if (error) throw new Error(error.message);
}

export async function clearCart(sessionToken: string): Promise<void> {
  const supabase = createPublicClient();
  const { error } = await supabase.rpc("cart_clear", { p_session_token: sessionToken });
  if (error) throw new Error(error.message);
}

/** Cart-analytics only (cart_events.retailer_shop_click) — never the real affiliate click, which only record_offer_click()/[go]/[offerId] ever records. Never throws: a logging failure must never block the visitor from actually reaching the retailer. */
export async function logShopClick(params: {
  sessionToken: string;
  offerId: string;
  productId: string;
  retailerId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createPublicClient();
  const { error } = await supabase.rpc("cart_log_shop_click", {
    p_session_token: params.sessionToken,
    p_offer_id: params.offerId,
    p_product_id: params.productId,
    p_retailer_id: params.retailerId,
    p_metadata: (params.metadata ?? {}) as never,
  });
  if (error) {
    // Analytics-only — swallow rather than let a logging hiccup block the redirect.
    console.error("cart_log_shop_click failed:", error.message);
  }
}

/** Live, authoritative cart contents for a session — empty array for a token with no session yet (never creates one; see session.ts's getCartSessionToken). */
export async function getCartItems(sessionToken: string): Promise<CartItemView[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("cart_get_items", { p_session_token: sessionToken });
  if (error) throw new Error(error.message);
  return data ?? [];
}
