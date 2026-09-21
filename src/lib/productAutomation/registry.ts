import "server-only";

import { getAdmitadConfig, hasAdmitadCredentials } from "./adapters/admitad/config";
import { getCjConfig, hasCjCredentials } from "./adapters/cj/config";

/**
 * The known affiliate networks the automation system can eventually talk
 * to, and which server-side env vars each needs. This is metadata only —
 * it never reads or exposes the actual credential values, just whether
 * they're present, so it's safe to use from Server Components/Actions that
 * render status to the admin UI.
 */
export type NetworkRegistryEntry = {
  key: string;
  label: string;
  /** Documents the env vars this network uses, for the admin UI. Not
   * necessarily a flat AND — see `isConfigured` when a network's real
   * requirement is more nuanced than "every one of these is set". */
  requiredEnvVars: string[];
  /** Overrides the default "every requiredEnvVars is set" check. Admitad's
   * real requirement is "an access token, OR a client id + secret" — not a
   * flat AND over a fixed list. This is account-level only: whether any
   * Admitad *program* is actually configured to sync is a separate,
   * per-program question answered by admitad_programs, not by this env-var
   * check (see programsStore.ts) — adding a program never needs a new env
   * var here. */
  isConfigured?: () => boolean;
};

export const NETWORK_REGISTRY: NetworkRegistryEntry[] = [
  {
    key: "admitad",
    label: "Admitad",
    requiredEnvVars: ["ADMITAD_ACCESS_TOKEN (or ADMITAD_CLIENT_ID + ADMITAD_CLIENT_SECRET)"],
    isConfigured: () => hasAdmitadCredentials(getAdmitadConfig()),
  },
  {
    key: "cj",
    label: "CJ",
    // Account-level only, same as Admitad: CJ_API_KEY (a Personal Access
    // Token, used directly — CJ has no separate OAuth exchange step) and
    // CJ_WEBSITE_ID (this account's own CID). Which advertisers are
    // discovered/enabled is a separate, per-program question answered by
    // cj_programs (see programsStore.ts) — adding an advertiser never
    // needs a new env var here.
    requiredEnvVars: ["CJ_API_KEY", "CJ_WEBSITE_ID"],
    isConfigured: () => hasCjCredentials(getCjConfig()),
  },
  {
    key: "clickbank",
    label: "ClickBank",
    requiredEnvVars: ["CLICKBANK_API_KEY"],
  },
];

/** True when this network's configuration is complete. Never returns the values themselves. */
export function isNetworkConfigured(entry: NetworkRegistryEntry): boolean {
  if (entry.isConfigured) return entry.isConfigured();
  return entry.requiredEnvVars.every((name) => Boolean(process.env[name]?.trim()));
}

export type NetworkStatus = {
  key: string;
  label: string;
  connected: boolean;
};

/** Connection status for every registered network — booleans only, safe to pass to a Client Component. */
export function getNetworkStatuses(): NetworkStatus[] {
  return NETWORK_REGISTRY.map((entry) => ({
    key: entry.key,
    label: entry.label,
    connected: isNetworkConfigured(entry),
  }));
}
