"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCartSessionToken, getOrCreateCartSessionToken } from "@/lib/cart/session";
import * as cartStore from "@/lib/cart/store";
import { REF_COOKIE_NAME } from "@/lib/constants";

/**
 * The only entry points the UI ever calls to mutate the cart — every one
 * wraps the underlying RPC in try/catch (an uncaught Server Action error
 * crashes the whole page, a lesson already learned the hard way on the CJ
 * sync work) and returns a plain result object instead. Never trusts a
 * price/offer pairing from the browser: cart_add_item re-validates the
 * offer server-side against live data, exactly like every other write in
 * this app.
 */

export type AddToCartActionResult = { ok: true; quantity: number } | { ok: false; message: string };

export async function addToCartAction(params: {
  productId: string;
  offerId: string;
  quantity?: number;
}): Promise<AddToCartActionResult> {
  try {
    const token = await getOrCreateCartSessionToken();
    const refCookie = (await cookies()).get(REF_COOKIE_NAME)?.value ?? null;

    const result = await cartStore.addToCart({
      sessionToken: token,
      productId: params.productId,
      offerId: params.offerId,
      ref: refCookie,
      quantity: params.quantity ?? 1,
    });

    revalidatePath("/cart");
    return { ok: true, quantity: result.quantity };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't add this to your cart.";
    return { ok: false, message };
  }
}

export type CartActionResult = { ok: true } | { ok: false; message: string };

export async function updateCartItemQuantityAction(cartItemId: string, quantity: number): Promise<CartActionResult> {
  try {
    const token = await getCartSessionToken();
    if (!token) return { ok: false, message: "No cart session." };
    await cartStore.updateCartItemQuantity({ sessionToken: token, cartItemId, quantity });
    revalidatePath("/cart");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't update quantity.";
    return { ok: false, message };
  }
}

export async function removeCartItemAction(cartItemId: string): Promise<CartActionResult> {
  try {
    const token = await getCartSessionToken();
    if (!token) return { ok: false, message: "No cart session." };
    await cartStore.removeCartItem({ sessionToken: token, cartItemId });
    revalidatePath("/cart");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't remove this item.";
    return { ok: false, message };
  }
}

export async function clearCartAction(): Promise<CartActionResult> {
  try {
    const token = await getCartSessionToken();
    if (!token) return { ok: true };
    await cartStore.clearCart(token);
    revalidatePath("/cart");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't clear your cart.";
    return { ok: false, message };
  }
}
