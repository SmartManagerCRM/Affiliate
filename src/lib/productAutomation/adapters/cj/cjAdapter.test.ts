import { describe, it, expect, vi } from "vitest";
import { CjAdapter } from "./cjAdapter";
import type { CjConfig } from "./config";

function makeConfig(overrides: Partial<CjConfig> = {}): CjConfig {
  return {
    apiKey: "test-pat",
    websiteId: "1234567",
    pid: "1234567",
    advertiserLookupBaseUrl: "https://advertiser-lookup.api.cj.test",
    graphqlApiUrl: "https://ads.api.cj.test/query",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const PRODUCT_A = { advertiserId: "1111", advertiserName: "Acme Store" };
const PRODUCT_B = { advertiserId: "2222", advertiserName: "Beta Co" };

function productsResponse(resultList: unknown[], totalCount: number | null = null) {
  return jsonResponse({ data: { products: { totalCount, resultList } } });
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

    it("sends the PAT as a Bearer token and the website id as the companyId GraphQL variable, against the GraphQL endpoint", async () => {
      const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        void url;
        void init;
        return productsResponse([PRODUCT_A], 1);
      });
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      await adapter.testConnection();

      const [url, init] = fetchImpl.mock.calls[0];
      expect(url.toString()).toBe("https://ads.api.cj.test/query");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-pat");
      const body = JSON.parse(init?.body as string);
      expect(body.variables.companyId).toBe("1234567");
      expect(body.query).toContain("partnerStatus: JOINED");
    });

    it("treats a top-level GraphQL errors array as a failure, not zero results", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ errors: [{ message: "Invalid companyId" }] }));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain("Invalid companyId");
    });
  });

  describe("HTTP error body surfacing — a bare status code alone isn't enough to diagnose a GraphQL 4xx", () => {
    it("surfaces a JSON errors[].message body on a non-2xx response", async () => {
      const fetchImpl = vi.fn(
        async () => new Response(JSON.stringify({ errors: [{ message: "Cannot query field 'publisherQueries' on type 'Query'." }] }), { status: 400 })
      );
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain("400");
      expect(result.message).toContain("Cannot query field 'publisherQueries' on type 'Query'.");
    });

    it("surfaces a plain-text body on a non-2xx response with no JSON errors", async () => {
      const fetchImpl = vi.fn(async () => new Response("Bad Request: invalid query", { status: 400 }));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const result = await adapter.testConnection();

      expect(result.message).toContain("Bad Request: invalid query");
    });

    it("falls back to the bare status message when the error body is empty", async () => {
      const fetchImpl = vi.fn(async () => new Response("", { status: 400 }));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const result = await adapter.testConnection();

      expect(result.message).toBe("Request failed with status 400");
    });
  });

  describe("API failure", () => {
    it("retries a transient 500 and succeeds on the second attempt", async () => {
      let calls = 0;
      const fetchImpl = vi.fn(async () => {
        calls += 1;
        if (calls === 1) return new Response("server error", { status: 500 });
        return productsResponse([PRODUCT_A], 1);
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

  describe("advertiser discovery via products(partnerStatus: JOINED)", () => {
    it("returns every distinct advertiser found across the product rows", async () => {
      const fetchImpl = vi.fn(async () => productsResponse([PRODUCT_A, PRODUCT_B], 2));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const advertisers = await adapter.discoverPrograms();

      expect(advertisers).toEqual([
        { cjAdvertiserId: "1111", advertiserName: "Acme Store" },
        { cjAdvertiserId: "2222", advertiserName: "Beta Co" },
      ]);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it("dedupes an advertiser that appears on multiple product rows", async () => {
      const fetchImpl = vi.fn(async () => productsResponse([PRODUCT_A, PRODUCT_A, PRODUCT_B, PRODUCT_A], 4));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const advertisers = await adapter.discoverPrograms();

      expect(advertisers).toEqual([
        { cjAdvertiserId: "1111", advertiserName: "Acme Store" },
        { cjAdvertiserId: "2222", advertiserName: "Beta Co" },
      ]);
    });

    it("returns an empty array for an empty result set rather than throwing", async () => {
      const fetchImpl = vi.fn(async () => productsResponse([], 0));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const advertisers = await adapter.discoverPrograms();

      expect(advertisers).toEqual([]);
    });

    it("paginates through multiple full pages until a short page ends the result set, deduping across pages", async () => {
      const fullPage = Array.from({ length: 100 }, () => PRODUCT_A); // one advertiser, 100 products
      const shortPage = [PRODUCT_B];
      let calls = 0;
      const fetchImpl = vi.fn(async () => {
        calls += 1;
        return productsResponse(calls === 1 ? fullPage : shortPage, null);
      });
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const advertisers = await adapter.discoverPrograms();

      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(advertisers).toEqual([
        { cjAdvertiserId: "1111", advertiserName: "Acme Store" },
        { cjAdvertiserId: "2222", advertiserName: "Beta Co" },
      ]);
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

  describe("product synchronization", () => {
    const PRODUCT_ROW = {
      id: "prod-1",
      title: "Wireless Headphones",
      description: "Noise-cancelling",
      brand: "Acme Audio",
      advertiserName: "Acme Store",
      targetCountry: "US",
      imageLink: "https://img.example/main.jpg",
      additionalImageLink: [],
      isDeleted: false,
      price: { amount: 49.99, currency: "USD" },
      salePrice: null,
      link: "https://acme.example/products/headphones", // must never end up as affiliateUrl
      linkCode: { clickUrl: "https://www.anrdoezrs.net/click-123" },
    };

    function productsFeedResponse(resultList: unknown[], totalCount: number | null = null) {
      return jsonResponse({ data: { products: { totalCount, resultList } } });
    }

    it("fetchProducts throws when no advertiserId is provided", async () => {
      const adapter = new CjAdapter({ config: makeConfig() });
      await expect(adapter.fetchProducts({})).rejects.toThrow(/advertiser id/i);
    });

    it("fetchProducts throws when unconfigured", async () => {
      const adapter = new CjAdapter({ config: makeConfig({ apiKey: null }) });
      await expect(adapter.fetchProducts({ advertiserId: "1111" })).rejects.toThrow(/CJ_API_KEY/);
    });

    it("sends companyId, partnerIds, and pid as GraphQL variables", async () => {
      const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        void url;
        void init;
        return productsFeedResponse([PRODUCT_ROW], 1);
      });
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      await adapter.fetchProducts({ advertiserId: "1111" });

      const [, init] = fetchImpl.mock.calls[0];
      const body = JSON.parse(init?.body as string);
      expect(body.variables.companyId).toBe("1234567");
      expect(body.variables.partnerIds).toEqual(["1111"]);
      expect(body.variables.pid).toBe("1234567"); // pid defaults to websiteId when CJ_PID isn't set
      expect(body.query).toContain("linkCode(pid: $pid)");
    });

    it("maps products with the CJ tracking URL as affiliateUrl, never the raw merchant link", async () => {
      const fetchImpl = vi.fn(async () => productsFeedResponse([PRODUCT_ROW], 1));
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const result = await adapter.fetchProducts({ advertiserId: "1111" });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].offers[0].affiliateUrl).toBe("https://www.anrdoezrs.net/click-123");
      expect(result.products[0].offers[0].affiliateUrl).not.toBe(PRODUCT_ROW.link);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it("paginates using totalCount and the cursor/offset convention", async () => {
      let calls = 0;
      const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        void url;
        void init;
        calls += 1;
        return productsFeedResponse([PRODUCT_ROW], 150);
      });
      const adapter = new CjAdapter({ config: makeConfig(), fetchImpl });

      const first = await adapter.fetchProducts({ advertiserId: "1111", limit: 100, cursor: null });
      expect(first.hasMore).toBe(true);
      expect(first.nextCursor).toBe("1");

      const second = await adapter.fetchProducts({ advertiserId: "1111", limit: 100, cursor: first.nextCursor });
      const [, init] = fetchImpl.mock.calls[1];
      const body = JSON.parse(init?.body as string);
      expect(body.variables.offset).toBe(1);
      expect(calls).toBe(2);
      void second;
    });

    it("normalize() maps a raw CJ product row the same way fetchProducts does", () => {
      const adapter = new CjAdapter({ config: makeConfig() });
      const product = adapter.normalize(PRODUCT_ROW);
      expect(product.externalProductId).toBe("prod-1");
      expect(product.offers[0].affiliateUrl).toBe("https://www.anrdoezrs.net/click-123");
    });

    it("fetchOffers returns an empty array rather than throwing (offers come back inline with fetchProducts)", async () => {
      const adapter = new CjAdapter({ config: makeConfig() });
      await expect(adapter.fetchOffers("anything")).resolves.toEqual([]);
    });
  });
});
