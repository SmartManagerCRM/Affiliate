import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NETWORK_REGISTRY, isNetworkConfigured, getNetworkStatuses } from "./registry";

const ENV_KEYS = Array.from(new Set(NETWORK_REGISTRY.flatMap((n) => n.requiredEnvVars)));

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

  it("reports a network as not configured when its env vars are missing", () => {
    const admitad = NETWORK_REGISTRY.find((n) => n.key === "admitad")!;
    expect(isNetworkConfigured(admitad)).toBe(false);
  });

  it("reports a network as not configured when only some of its env vars are set", () => {
    const admitad = NETWORK_REGISTRY.find((n) => n.key === "admitad")!;
    process.env.ADMITAD_CLIENT_ID = "test-id";
    // ADMITAD_CLIENT_SECRET intentionally left unset
    expect(isNetworkConfigured(admitad)).toBe(false);
  });

  it("reports a network as configured once every required env var is set", () => {
    const admitad = NETWORK_REGISTRY.find((n) => n.key === "admitad")!;
    process.env.ADMITAD_CLIENT_ID = "test-id";
    process.env.ADMITAD_CLIENT_SECRET = "test-secret";
    expect(isNetworkConfigured(admitad)).toBe(true);
  });

  it("treats a blank env var as not configured", () => {
    const clickbank = NETWORK_REGISTRY.find((n) => n.key === "clickbank")!;
    process.env.CLICKBANK_API_KEY = "   ";
    expect(isNetworkConfigured(clickbank)).toBe(false);
  });

  it("returns every network as Not Connected with no credentials set (Phase 1 default)", () => {
    const statuses = getNetworkStatuses();
    expect(statuses).toHaveLength(3);
    expect(statuses.every((s) => s.connected === false)).toBe(true);
  });

  it("never returns the credential values themselves, only booleans", () => {
    process.env.ADMITAD_CLIENT_ID = "super-secret-id";
    process.env.ADMITAD_CLIENT_SECRET = "super-secret-value";

    const statuses = getNetworkStatuses();
    const serialized = JSON.stringify(statuses);

    expect(serialized).not.toContain("super-secret-id");
    expect(serialized).not.toContain("super-secret-value");
    expect(statuses.find((s) => s.key === "admitad")?.connected).toBe(true);
  });
});
