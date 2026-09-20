import { describe, it, expect, vi } from "vitest";
import { AdmitadAdapter } from "./admitadAdapter";
import type { AdmitadConfig } from "./config";

function makeConfig(overrides: Partial<AdmitadConfig> = {}): AdmitadConfig {
  return {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    accessToken: null,
    productFeedUrl: "https://example.test/feed.csv",
    apiBaseUrl: "https://api.admitad.test",
    ...overrides,
  };
}

const SAMPLE_CSV = [
  "id,name,price,currency,url,image",
  "p-1,Widget,19.99,USD,https://example.test/go/p-1,https://example.test/p-1.jpg",
  "p-2,Gadget,29.99,USD,https://example.test/go/p-2,https://example.test/p-2.jpg",
].join("\n");

function tokenResponse(token = "test-access-token") {
  return new Response(JSON.stringify({ access_token: token }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function feedResponse(csv = SAMPLE_CSV) {
  return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv" } });
}

describe("AdmitadAdapter", () => {
  describe("authentication", () => {
    it("exchanges client id/secret for an access token, then fetches the feed", async () => {
      const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
        const href = input.toString();
        if (href.includes("/token/")) return tokenResponse();
        if (href.includes("feed.csv")) return feedResponse();
        throw new Error(`Unexpected URL: ${href}`);
      });

      const adapter = new AdmitadAdapter({ config: makeConfig(), fetchImpl });
      const result = await adapter.testConnection();

      expect(result.ok).toBe(true);
      expect(fetchImpl).toHaveBeenCalledWith(
        expect.stringContaining("/token/"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("uses a pre-configured access token without requesting a new one", async () => {
      const fetchImpl = vi.fn(async () => feedResponse());
      const adapter = new AdmitadAdapter({
        config: makeConfig({ clientId: null, clientSecret: null, accessToken: "preset-token" }),
        fetchImpl,
      });

      await adapter.fetchProducts({});

      expect(fetchImpl).not.toHaveBeenCalledWith(expect.stringContaining("/token/"), expect.anything());
    });

    it("testConnection reports not-configured without throwing when nothing is set", async () => {
      const fetchImpl = vi.fn();
      const adapter = new AdmitadAdapter({
        config: makeConfig({ clientId: null, clientSecret: null, accessToken: null, productFeedUrl: null }),
        fetchImpl,
      });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("testConnection reports failure when the token request is rejected (401)", async () => {
      const fetchImpl = vi.fn(async () => new Response("unauthorized", { status: 401 }));
      const adapter = new AdmitadAdapter({ config: makeConfig(), fetchImpl });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain("401");
    });

    it("does not retry a 401 (non-transient) — fetchImpl is called exactly once", async () => {
      const fetchImpl = vi.fn(async () => new Response("unauthorized", { status: 401 }));
      const adapter = new AdmitadAdapter({ config: makeConfig(), fetchImpl });

      await adapter.testConnection();

      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
  });

  describe("fetchProducts", () => {
    it("parses the feed and returns normalized products", async () => {
      const fetchImpl = vi.fn(async () => feedResponse());
      const adapter = new AdmitadAdapter({ config: makeConfig({ clientId: null, clientSecret: null, accessToken: "t" }), fetchImpl });

      const result = await adapter.fetchProducts({});

      expect(result.products).toHaveLength(2);
      expect(result.products[0]).toMatchObject({ externalProductId: "p-1", name: "Widget" });
      expect(result.hasMore).toBe(false);
    });

    it("paginates using params.limit and params.cursor", async () => {
      const fetchImpl = vi.fn(async () => feedResponse());
      const adapter = new AdmitadAdapter({ config: makeConfig({ clientId: null, clientSecret: null, accessToken: "t" }), fetchImpl });

      const page1 = await adapter.fetchProducts({ limit: 1 });
      expect(page1.products).toHaveLength(1);
      expect(page1.products[0].externalProductId).toBe("p-1");
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBe("1");

      const page2 = await adapter.fetchProducts({ limit: 1, cursor: page1.nextCursor });
      expect(page2.products).toHaveLength(1);
      expect(page2.products[0].externalProductId).toBe("p-2");
      expect(page2.hasMore).toBe(false);
    });

    it("caches the downloaded feed across calls instead of re-fetching every page", async () => {
      const fetchImpl = vi.fn(async () => feedResponse());
      const adapter = new AdmitadAdapter({ config: makeConfig({ clientId: null, clientSecret: null, accessToken: "t" }), fetchImpl });

      await adapter.fetchProducts({ limit: 1 });
      await adapter.fetchProducts({ limit: 1, cursor: "1" });

      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it("degrades gracefully on a malformed feed row instead of throwing", async () => {
      const malformedCsv = "id,name\np-1,\n,Nameless Product\n";
      const fetchImpl = vi.fn(async () => feedResponse(malformedCsv));
      const adapter = new AdmitadAdapter({ config: makeConfig({ clientId: null, clientSecret: null, accessToken: "t" }), fetchImpl });

      const result = await adapter.fetchProducts({});

      expect(result.products).toHaveLength(2);
      expect(result.products[0].name).toBe("");
      expect(result.products[1].externalProductId).toBe("");
    });

    it("throws a clear error when no product feed URL is configured", async () => {
      const fetchImpl = vi.fn();
      const adapter = new AdmitadAdapter({
        config: makeConfig({ productFeedUrl: null, clientId: null, clientSecret: null, accessToken: "t" }),
        fetchImpl,
      });

      await expect(adapter.fetchProducts({})).rejects.toThrow(/ADMITAD_PRODUCT_FEED_URL/);
    });
  });

  describe("retry behavior", () => {
    it("retries a transient 500 and succeeds on the second attempt", async () => {
      let calls = 0;
      const fetchImpl = vi.fn(async () => {
        calls += 1;
        if (calls === 1) return new Response("server error", { status: 500 });
        return feedResponse();
      });

      const adapter = new AdmitadAdapter({ config: makeConfig({ clientId: null, clientSecret: null, accessToken: "t" }), fetchImpl });
      const result = await adapter.fetchProducts({});

      expect(result.products).toHaveLength(2);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    }, 10_000);

    it("retries on 429 rate limiting", async () => {
      let calls = 0;
      const fetchImpl = vi.fn(async () => {
        calls += 1;
        if (calls === 1) return new Response("too many requests", { status: 429 });
        return feedResponse();
      });

      const adapter = new AdmitadAdapter({ config: makeConfig({ clientId: null, clientSecret: null, accessToken: "t" }), fetchImpl });
      const result = await adapter.fetchProducts({});

      expect(result.products).toHaveLength(2);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    }, 10_000);

    it("gives up after repeated transient failures and surfaces the error", async () => {
      const fetchImpl = vi.fn(async () => new Response("server error", { status: 500 }));
      const adapter = new AdmitadAdapter({ config: makeConfig({ clientId: null, clientSecret: null, accessToken: "t" }), fetchImpl });

      await expect(adapter.fetchProducts({})).rejects.toThrow(/500/);
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

      const adapter = new AdmitadAdapter({
        config: makeConfig({ clientId: null, clientSecret: null, accessToken: "t" }),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        timeoutMs: 25,
      });

      await expect(adapter.fetchProducts({})).rejects.toThrow(/timed out/i);
      expect(fetchImpl).toHaveBeenCalledTimes(3); // default maxAttempts
    }, 10_000);
  });

  describe("normalize", () => {
    it("maps a raw feed row into the normalized shape", () => {
      const adapter = new AdmitadAdapter({ config: makeConfig() });
      const product = adapter.normalize({ id: "p-9", name: "Direct Row", price: "5", currency: "USD", url: "https://example.test/go/9" });
      expect(product.externalProductId).toBe("p-9");
      expect(product.name).toBe("Direct Row");
    });
  });
});
