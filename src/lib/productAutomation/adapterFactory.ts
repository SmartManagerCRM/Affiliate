import "server-only";

import type { AffiliateNetworkAdapter } from "./types";
import { NETWORK_REGISTRY, isNetworkConfigured } from "./registry";
import { AdmitadAdapter } from "./adapters/admitad/admitadAdapter";

/**
 * Builds a ready-to-use adapter instance for a connected, implemented
 * network. Returns null for a network that isn't configured, or one whose
 * adapter doesn't exist yet (CJ/ClickBank land in later phases) — never
 * throws, so callers can simply skip what isn't available.
 */
export function getAdapterForNetwork(key: string): AffiliateNetworkAdapter | null {
  const entry = NETWORK_REGISTRY.find((n) => n.key === key);
  if (!entry || !isNetworkConfigured(entry)) return null;

  switch (key) {
    case "admitad":
      return new AdmitadAdapter();
    default:
      return null;
  }
}
