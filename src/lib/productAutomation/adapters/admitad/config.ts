import "server-only";

/**
 * Account-level Admitad configuration ONLY — no program/advertiser/feed
 * data belongs here. There is exactly one Admitad connection per deployment
 * (this account's OAuth credentials), and it never grows a new env var
 * per advertiser program: every program lives in the admitad_programs
 * Supabase table instead (see programsStore.ts), each with its own
 * feed URL/id/country/active flag. Adding a program is a database row,
 * never a Hostinger environment variable.
 *
 * ADMITAD_API_BASE_URL's default is my best-effort recollection of
 * Admitad's REST API host, NOT verified against live documentation (this
 * sandbox has no network access to admitad.com to confirm it). Override it
 * with the env var if it turns out to be wrong.
 */
const DEFAULT_API_BASE_URL = "https://api.admitad.com";

export type AdmitadConfig = {
  clientId: string | null;
  clientSecret: string | null;
  /** A pre-generated long-lived token, if you have one — skips the OAuth exchange entirely when set. */
  accessToken: string | null;
  apiBaseUrl: string;
};

export function getAdmitadConfig(): AdmitadConfig {
  return {
    clientId: process.env.ADMITAD_CLIENT_ID?.trim() || null,
    clientSecret: process.env.ADMITAD_CLIENT_SECRET?.trim() || null,
    accessToken: process.env.ADMITAD_ACCESS_TOKEN?.trim() || null,
    apiBaseUrl: process.env.ADMITAD_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
  };
}

/** Enough to authenticate: either a ready-made access token, or a client id+secret pair to exchange for one. This is now the complete "is Admitad connected" answer — whether any program/feed is configured is a separate, per-program question answered by admitad_programs. */
export function hasAdmitadCredentials(config: AdmitadConfig): boolean {
  return Boolean(config.accessToken) || Boolean(config.clientId && config.clientSecret);
}
