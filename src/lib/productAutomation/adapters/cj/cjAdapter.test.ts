import { describe, it, expect, vi } from "vitest";
import { CjAdapter } from "./cjAdapter";
import type { CjConfig } from "./config";

function makeConfig(overrides: Partial<CjConfig> = {}): CjConfig {
  return {
    apiKey: "test-pat",
    websiteId: "1234567",
    advertiserLookupBaseUrl: "https://advertiser-lookup.api.cj.test",
    graphqlApiUrl: "https://ads.api.cj.test/query",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const CONTRACT_A = { advertiserId: "1111", advertiserName: "Acme Store", status: "active" };
const CONTRACT_B = { advertiserId: "2222", advertiserName: "Beta Co", status: "pending" };

function contractsResponse(resultList: unknown[], totalCount: number | null = null) {
  return jsonResponse({ data: { publisherQueries: { contracts: { totalCount, resultList } } } });
}

const SAMPLE_XML = `<?xml version="1.0"?><cj-api><advertisers total-matched="2">
  <advertiser>
    <advertiser-id>1111</advertiser-id>
    <advertiser-name>Acme Store</advertiser-name>
    <account-status>active</account-status>
    <relationship-status>joined</relationship-status>
    <program-url><![CDATA[https://acme.example/affiliates]]></program-url>
  </advertiser>
</advertisers></cj-api>`;

function xmlResponse(xml = SAMPLE_XML) {
  return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml" } });
}

describe("CjAdapter", () => {
  describe("authentication failure — no credentials configured", () => {
    it("connect() throws a clear error without making a network call", async () => {
      const fetchImpl = vi.fn();
      const adapter = new CjAdapter({ config: makeConfig({ apiKey: null, websiteId: null }), fetchImpl });

      await expect(adapter.connect()).rejects.toThrow(/CJ_API_KEY/);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("testConnection reports not-configured without making a network call when only half the credential pair is set", async () => {
      const fetchImpl = vi.fn();
      const adapter = new CjAdapter({ config: makeConfig({ apiKey: "test-pat", websiteId: null }), fetchImpl });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("discoverPrograms() throws rather than silently returning an empty list when unconfigured", async () => {
      const fetchImpl = vi.fn();
      const adapter = new CjAdapter({ config: makeConfig({ apiKey: null }), fetchImpl });

      await expect(adapter.discoverPrograms()).rejects.toThrow(/CJ_API_KEY/);
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  describe("invalid credentials — CJ rejects the token", () => {
    it("testConnection reports failure on a 401", async () => {
      const fetchImpl = vi.fn(async () => new Response("unauthorized", { status: 401 }));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain("401");
    });

    it("does not retry a 401 (non-transient) — fetchImpl is called exactly once", async () => {
      const fetchImpl = vi.fn(async () => new Response("unauthorized", { status: 401 }));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      await adapter.testConnection();

      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it("sends the PAT as a Bearer token and the website id as the publisherId GraphQL variable, against the GraphQL endpoint", async () => {
      const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        void url;
        void init;
        return contractsResponse([CONTRACT_A], 1);
      });
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      await adapter.testConnection();

      const [url, init] = fetchImpl.mock.calls[0];
      expect(url.toString()).toBe("https://ads.api.cj.test/query");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-pat");
      const body = JSON.parse(init?.body as string);
      expect(body.variables.publisherId).toBe("1234567");
    });

    it("treats a top-level GraphQL errors array as a failure, not zero results", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ errors: [{ message: "Invalid publisherId" }] }));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain("Invalid publisherId");
    });
  });

  describe("API failure", () => {
    it("retries a transient 500 and succeeds on the second attempt", async () => {
      let calls = 0;
      const fetchImpl = vi.fn(async () => {
        calls += 1;
        if (calls === 1) return new Response("server error", { status: 500 });
        return contractsResponse([CONTRACT_A], 1);
      });
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(true);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    }, 10_000);

    it("gives up after repeated transient failures and surfaces the error", async () => {
      const fetchImpl = vi.fn(async () => new Response("server error", { status: 500 }));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      await expect(adapter.discoverPrograms()).rejects.toThrow(/500/);
      expect(fetchImpl).toHaveBeenCalledTimes(3); // default maxAttempts
    }, 10_000);

    it("times out a hanging request and treats it as retryable", async () => {
      const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      });
      const adapter = new CjAdapter({
        config: makeConfig(),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        timeoutMs: 25,
      });

      await expect(adapter.discoverPrograms()).rejects.toThrow(/timed out/i);
      expect(fetchImpl).toHaveBeenCalledTimes(3); // default maxAttempts
    }, 10_000);
  });

  describe("advertiser/contract discovery", () => {
    it("returns every discovered contract, parsed from the Contracts GraphQL response", async () => {
      const fetchImpl = vi.fn(async () => contractsResponse([CONTRACT_A, CONTRACT_B], 2));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const contracts = await adapter.discoverPrograms();

      expect(contracts).toEqual([
        { cjAdvertiserId: "1111", advertiserName: "Acme Store", status: "active" },
        { cjAdvertiserId: "2222", advertiserName: "Beta Co", status: "pending" },
      ]);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it("returns an empty array for an empty result set rather than throwing", async () => {
      const fetchImpl = vi.fn(async () => contractsResponse([], 0));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const contracts = await adapter.discoverPrograms();

      expect(contracts).toEqual([]);
    });

    it("paginates through multiple full pages until a short page ends the result set", async () => {
      const fullPage = Array.from({ length: 100 }, (_, i) => ({
        advertiserId: String(i + 1),
        advertiserName: `Advertiser ${i + 1}`,
        status: "active",
      }));
      const shortPage = [CONTRACT_B];
      let calls = 0;
      const fetchImpl = vi.fn(async () => {
        calls += 1;
        return contractsResponse(calls === 1 ? fullPage : shortPage, null);
      });
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const contracts = await adapter.discoverPrograms();

      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(contracts).toHaveLength(101);
      expect(contracts[100]).toEqual({ cjAdvertiserId: "2222", advertiserName: "Beta Co", status: "pending" });
    });
  });

  describe("lookupAdvertisers — kept as a secondary/manual-lookup capability, no longer wired to discoverPrograms", () => {
    it("still parses the Advertiser Lookup XML response when called directly", async () => {
      const fetchImpl = vi.fn(async () => xmlResponse());
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const advertisers = await adapter.lookupAdvertisers();

      expect(advertisers).toEqual([
        { cjAdvertiserId: "1111", advertiserName: "Acme Store", programUrl: "https://acme.example/affiliates", relationshipStatus: "joined", accountStatus: "active" },
      ]);
    });
  });

  describe("product synchronization — deliberately not implemented yet", () => {
    it("fetchProducts throws a clear not-implemented error", async () => {
      const adapter = new CjAdapter({ config: makeConfig() });
      await expect(adapter.fetchProducts({})).rejects.toThrow(/not implemented/i);
    });

    it("normalize throws a clear not-implemented error", () => {
      const adapter = new CjAdapter({ config: makeConfig() });
      expect(() => adapter.normalize({})).toThrow(/not implemented/i);
    });

    it("fetchOffers returns an empty array rather than throwing (unused by the pipeline today)", async () => {
      const adapter = new CjAdapter({ config: makeConfig() });
      await expect(adapter.fetchOffers("anything")).resolves.toEqual([]);
    });
  });
});
