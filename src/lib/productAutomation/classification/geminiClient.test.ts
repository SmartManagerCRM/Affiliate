import { describe, it, expect, vi } from "vitest";
import { GeminiClassificationClient } from "./geminiClient";
import type { NormalizedProduct } from "../types";
import type { ClassificationTaxonomy } from "./classificationStore";

const PRODUCT: NormalizedProduct = {
  externalProductId: "p-1",
  name: "Espresso Machine",
  brand: "MockBrand",
  images: [],
  raw: {},
  offers: [],
};

const TAXONOMY: ClassificationTaxonomy = {
  activities: [{ id: "act-coffee", name: "Coffee" }],
  categories: [{ id: "cat-machines", name: "Espresso Machines", activityId: "act-coffee" }],
};

function generateContentResponse(parsedJson: unknown) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(parsedJson) }] } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

describe("GeminiClassificationClient", () => {
  it("throws immediately when no API key is configured, without calling fetch", async () => {
    const fetchImpl = vi.fn();
    const client = new GeminiClassificationClient({ apiKey: null, fetchImpl });

    await expect(client.classify(PRODUCT, TAXONOMY)).rejects.toThrow(/GEMINI_API_KEY/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends the api key header and forces JSON schema output against the default model", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl.mockImplementation(async () => generateContentResponse({ activityId: "act-coffee" }));
    const client = new GeminiClassificationClient({ apiKey: "test-key", fetchImpl });

    await client.classify(PRODUCT, TAXONOMY);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    const headers = init!.headers as Record<string, string>;
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent");
    expect(headers["x-goog-api-key"]).toBe("test-key");
    const body = JSON.parse(init!.body as string);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema.required).toContain("activityId");
  });

  it("includes the taxonomy's real ids and the product name in the prompt", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl.mockImplementation(async () => generateContentResponse({}));
    const client = new GeminiClassificationClient({ apiKey: "test-key", fetchImpl });

    await client.classify(PRODUCT, TAXONOMY);

    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init!.body as string);
    const promptText = body.contents[0].parts[0].text as string;
    expect(promptText).toContain("act-coffee");
    expect(promptText).toContain("cat-machines");
    expect(promptText).toContain("Espresso Machine");
  });

  it("returns the parsed JSON response, unvalidated", async () => {
    const parsed = { activityId: "act-coffee", categoryIds: ["cat-machines"], confidence: 0.8 };
    const fetchImpl = vi.fn(async () => generateContentResponse(parsed));
    const client = new GeminiClassificationClient({ apiKey: "test-key", fetchImpl });

    const result = await client.classify(PRODUCT, TAXONOMY);
    expect(result).toEqual(parsed);
  });

  it("throws when the response has no candidates/text", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ candidates: [] }), { status: 200 }));
    const client = new GeminiClassificationClient({ apiKey: "test-key", fetchImpl });

    await expect(client.classify(PRODUCT, TAXONOMY)).rejects.toThrow(/generated text/i);
  });

  it("throws when the response text is not valid JSON", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }), { status: 200 })
    );
    const client = new GeminiClassificationClient({ apiKey: "test-key", fetchImpl });

    await expect(client.classify(PRODUCT, TAXONOMY)).rejects.toThrow(/not valid JSON/i);
  });

  it("does not retry a 401 (non-transient)", async () => {
    const fetchImpl = vi.fn(async () => new Response("unauthorized", { status: 401 }));
    const client = new GeminiClassificationClient({ apiKey: "bad-key", fetchImpl });

    await expect(client.classify(PRODUCT, TAXONOMY)).rejects.toThrow(/401/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a transient 503 and succeeds", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) return new Response("overloaded", { status: 503 });
      return generateContentResponse({ activityId: "act-coffee" });
    });
    const client = new GeminiClassificationClient({ apiKey: "test-key", fetchImpl });

    const result = await client.classify(PRODUCT, TAXONOMY);
    expect(result).toEqual({ activityId: "act-coffee" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("times out a hanging request", async () => {
    const fetchImpl = vi.fn((...args: Parameters<typeof fetch>) => {
      const init = args[1];
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    const client = new GeminiClassificationClient({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 25,
    });

    await expect(client.classify(PRODUCT, TAXONOMY)).rejects.toThrow(/timed out/i);
  }, 10_000);

  it("uses the configured model override in the request URL", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl.mockImplementation(async () => generateContentResponse({}));
    const client = new GeminiClassificationClient({ apiKey: "test-key", model: "custom-model", fetchImpl });

    await client.classify(PRODUCT, TAXONOMY);

    const [url] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/custom-model:generateContent");
  });
});
