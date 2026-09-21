import { randomBytes } from "crypto";

/**
 * The Smart Cart's anonymous session token — an opaque, high-entropy value
 * (256 bits, base64url) stored in an httpOnly cookie, never readable or
 * settable by client JS. The token itself is the credential the cart RPCs
 * (cart_add_item, cart_get_items, ...) authenticate every read/write
 * against, so it's generated with crypto.randomBytes, not Math.random or a
 * sequential id — same reasoning as any other bearer-token-style session.
 * Kept in its own file (no "server-only"/next/headers import) so it's
 * trivially unit-testable, unlike session.ts's cookie-touching functions
 * which need a real request context.
 */
export function generateCartSessionToken(): string {
  return randomBytes(32).toString("base64url");
}
