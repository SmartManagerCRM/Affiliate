import { NextResponse, type NextRequest } from "next/server";
import { getCartSessionToken } from "@/lib/cart/session";
import { logShopClick } from "@/lib/cart/store";

/**
 * Cart analytics only (cart_events.retailer_shop_click) — fired from the
 * client right as a visitor clicks a Shop link, using `fetch(..., {
 * keepalive: true })` so the request survives the page unload that follows
 * (the click also navigates to /go/[offerId] in the same tick). Never the
 * real affiliate click: that's recorded exclusively by /go/[offerId]'s own
 * record_offer_click() call, untouched by this route. Read-only on the
 * session — a visitor with no cart cookie yet just gets {ok:true} with
 * nothing logged, never a session created here.
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getCartSessionToken();
    if (!token) {
      return NextResponse.json({ ok: true });
    }

    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body.offerId !== "string" ||
      typeof body.productId !== "string" ||
      typeof body.retailerId !== "string"
    ) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await logShopClick({
      sessionToken: token,
      offerId: body.offerId,
      productId: body.productId,
      retailerId: body.retailerId,
      metadata:
        body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[cart/shop-click] failed to log shop click:", error);
    return NextResponse.json({ ok: true });
  }
}
