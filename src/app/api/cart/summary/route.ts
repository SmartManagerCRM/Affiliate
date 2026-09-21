import { NextResponse } from "next/server";
import { getCartSessionToken } from "@/lib/cart/session";
import { getCartItems } from "@/lib/cart/store";

/**
 * Per-visitor, never cached — the header's live cart badge fetches this
 * client-side (see CartProvider) rather than making the whole page/layout
 * dynamic just to show a count. Read-only: a visitor with no cart cookie
 * yet gets {count: 0} without ever creating a session row.
 */
export async function GET() {
  try {
    const token = await getCartSessionToken();
    if (!token) {
      return NextResponse.json({ count: 0 }, { headers: { "Cache-Control": "no-store" } });
    }

    const items = await getCartItems(token);
    return NextResponse.json({ count: items.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[cart/summary] failed to load cart count:", error);
    return NextResponse.json({ count: 0 }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
