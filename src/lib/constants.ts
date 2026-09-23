export const SITE_NAME = "Selected Items";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://selected-items.smartmanager.me";

export const SITE_TAGLINE = "Smart products. Carefully selected.";

export const AFFILIATE_DISCLOSURE =
  "Selected Items may earn a commission when you purchase through certain links. This does not affect the price you pay.";

/** Shown at the bottom of the Privacy Policy page. Replace with a real, monitored inbox before launch. */
export const PRIVACY_CONTACT_EMAIL = "privacy@selected-items.com";

/** Cookie that carries client-site attribution (?ref=) across the visit. */
export const REF_COOKIE_NAME = "si_ref";
export const REF_COOKIE_MAX_AGE_DAYS = 30;

/** httpOnly cookie holding the anonymous Smart Cart session token. Created lazily on first "Add to Cart", never on a bare pageview. */
export const CART_SESSION_COOKIE_NAME = "si_cart";
export const CART_SESSION_COOKIE_MAX_AGE_DAYS = 30;

export const ADMITAD_VERIFICATION_CONTENT =
  "7b4225f7-5ec5-42da-a529-8bcdf03047c6";
