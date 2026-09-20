import "server-only";

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
  requiredEnvVars: string[];
};

export const NETWORK_REGISTRY: NetworkRegistryEntry[] = [
  {
    key: "admitad",
    label: "Admitad",
    requiredEnvVars: ["ADMITAD_CLIENT_ID", "ADMITAD_CLIENT_SECRET"],
  },
  {
    key: "cj",
    label: "CJ",
    requiredEnvVars: ["CJ_API_KEY", "CJ_WEBSITE_ID"],
  },
  {
    key: "clickbank",
    label: "ClickBank",
    requiredEnvVars: ["CLICKBANK_API_KEY"],
  },
];

/** True only when every env var this network needs is set. Never returns the values themselves. */
export function isNetworkConfigured(entry: NetworkRegistryEntry): boolean {
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
