import "server-only";

import type { AffiliateNetworkAdapter } from "./types";
import { NETWORK_REGISTRY, isNetworkConfigured } from "./registry";
import { AdmitadAdapter } from "./adapters/admitad/admitadAdapter";
import { CjAdapter } from "./adapters/cj/cjAdapter";

/**
 * Builds a ready-to-use adapter instance for a connected, implemented
 * network. Returns null for a network that isn't configured, or one whose
 * adapter doesn't exist yet (ClickBank lands in a later phase) — never
 * throws, so callers can simply skip what isn't available. Note: Admitad
 * and CJ are both program-scoped (many advertisers, not one fixed feed) and
 * are driven directly by their own runAdmitadPrograms()/runCjPrograms()
 * helpers in runScheduledSync.ts rather than through this factory — it's
 * kept in sync here mainly for any other caller that just needs *an*
 * adapter instance for a connected network.
 */
export function getAdapterForNetwork(key: string): AffiliateNetworkAdapter | null {
  const entry = NETWORK_REGISTRY.find((n) => n.key === key);
  if (!entry || !isNetworkConfigured(entry)) return null;

  switch (key) {
    case "admitad":
      return new AdmitadAdapter();
    case "cj":
      return new CjAdapter();
    default:
      return null;
  }
}
