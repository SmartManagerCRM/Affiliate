import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NETWORK_REGISTRY, isNetworkConfigured, getNetworkStatuses } from "./registry";

const ENV_KEYS = [
  "ADMITAD_ACCESS_TOKEN",
  "ADMITAD_CLIENT_ID",
  "ADMITAD_CLIENT_SECRET",
  "ADMITAD_PRODUCT_FEED_URL",
  "ADMITAD_API_BASE_URL",
  "CJ_API_KEY",
  "CJ_WEBSITE_ID",
  "CLICKBANK_API_KEY",
];

function clearNetworkEnvVars() {
  for (const key of ENV_KEYS) delete process.env[key];
}

describe("product automation network registry", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
    clearNetworkEnvVars();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("lists Admitad, CJ, and ClickBank", () => {
    const keys = NETWORK_REGISTRY.map((n) => n.key).sort();
    expect(keys).toEqual(["admitad", "cj", "clickbank"]);
  });

  it("reports Admitad as not configured when nothing is set", () => {
    const admitad = NETWORK_REGISTRY.find((n) => n.key === "admitad")!;
    expect(isNetworkConfigured(admitad)).toBe(false);
  });

  it("reports Admitad as not configured with credentials but no feed URL", () => {
    const admitad = NETWORK_REGISTRY.find((n) => n.key === "admitad")!;
    process.env.ADMITAD_CLIENT_ID = "test-id";
    process.env.ADMITAD_CLIENT_SECRET = "test-secret";
    // ADMITAD_PRODUCT_FEED_URL intentionally left unset
    expect(isNetworkConfigured(admitad)).toBe(false);
  });

  it("reports Admitad as not configured with a feed URL but only half a credential pair", () => {
    const admitad = NETWORK_REGISTRY.find((n) => n.key === "admitad")!;
    process.env.ADMITAD_CLIENT_ID = "test-id";
    // ADMITAD_CLIENT_SECRET intentionally left unset
    process.env.ADMITAD_PRODUCT_FEED_URL = "https://example.test/feed.csv";
    expect(isNetworkConfigured(admitad)).toBe(false);
  });

  it("reports Admitad as configured with a client id/secret pair and a feed URL", () => {
    const admitad = NETWORK_REGISTRY.find((n) => n.key === "admitad")!;
    process.env.ADMITAD_CLIENT_ID = "test-id";
    process.env.ADMITAD_CLIENT_SECRET = "test-secret";
    process.env.ADMITAD_PRODUCT_FEED_URL = "https://example.test/feed.csv";
    expect(isNetworkConfigured(admitad)).toBe(true);
  });

  it("reports Admitad as configured with just an access token and a feed URL", () => {
    const admitad = NETWORK_REGISTRY.find((n) => n.key === "admitad")!;
    process.env.ADMITAD_ACCESS_TOKEN = "test-token";
    process.env.ADMITAD_PRODUCT_FEED_URL = "https://example.test/feed.csv";
    expect(isNetworkConfigured(admitad)).toBe(true);
  });

  it("treats a blank env var as not configured", () => {
    const clickbank = NETWORK_REGISTRY.find((n) => n.key === "clickbank")!;
    process.env.CLICKBANK_API_KEY = "   ";
    expect(isNetworkConfigured(clickbank)).toBe(false);
  });

  it("returns every network as Not Connected with no credentials set (default)", () => {
    const statuses = getNetworkStatuses();
    expect(statuses).toHaveLength(3);
    expect(statuses.every((s) => s.connected === false)).toBe(true);
  });

  it("never returns the credential values themselves, only booleans", () => {
    process.env.ADMITAD_CLIENT_ID = "super-secret-id";
    process.env.ADMITAD_CLIENT_SECRET = "super-secret-value";
    process.env.ADMITAD_PRODUCT_FEED_URL = "https://example.test/super-secret-feed.csv";

    const statuses = getNetworkStatuses();
    const serialized = JSON.stringify(statuses);

    expect(serialized).not.toContain("super-secret-id");
    expect(serialized).not.toContain("super-secret-value");
    expect(serialized).not.toContain("super-secret-feed");
    expect(statuses.find((s) => s.key === "admitad")?.connected).toBe(true);
  });
});
