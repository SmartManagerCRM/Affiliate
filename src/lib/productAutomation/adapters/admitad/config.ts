import "server-only";

/**
 * Every value here comes from a server-side env var — nothing is
 * hard-coded per-account. In particular the feed URL is entirely your
 * Admitad publisher account's own config, not something this app guesses.
 *
 * ADMITAD_API_BASE_URL's default is my best-effort recollection of
 * Admitad's REST API host, NOT verified against live documentation (this
 * sandbox has no network access to admitad.com to confirm it). It's only
 * used by testConnection()/the OAuth token request — fetchProducts() never
 * touches it, since product data comes from ADMITAD_PRODUCT_FEED_URL
 * instead. Override it with the env var if it turns out to be wrong.
 */
const DEFAULT_API_BASE_URL = "https://api.admitad.com";

export type AdmitadConfig = {
  clientId: string | null;
  clientSecret: string | null;
  /** A pre-generated long-lived token, if you have one — skips the OAuth exchange entirely when set. */
  accessToken: string | null;
  productFeedUrl: string | null;
  apiBaseUrl: string;
};

export function getAdmitadConfig(): AdmitadConfig {
  return {
    clientId: process.env.ADMITAD_CLIENT_ID?.trim() || null,
    clientSecret: process.env.ADMITAD_CLIENT_SECRET?.trim() || null,
    accessToken: process.env.ADMITAD_ACCESS_TOKEN?.trim() || null,
    productFeedUrl: process.env.ADMITAD_PRODUCT_FEED_URL?.trim() || null,
    apiBaseUrl: process.env.ADMITAD_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
  };
}

/** Enough to authenticate: either a ready-made access token, or a client id+secret pair to exchange for one. */
export function hasAdmitadCredentials(config: AdmitadConfig): boolean {
  return Boolean(config.accessToken) || Boolean(config.clientId && config.clientSecret);
}

/** Enough to actually pull product data — credentials alone aren't sufficient without a feed to read. */
export function isAdmitadFullyConfigured(config: AdmitadConfig): boolean {
  return hasAdmitadCredentials(config) && Boolean(config.productFeedUrl);
}
