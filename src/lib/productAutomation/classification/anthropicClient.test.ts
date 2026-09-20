import { describe, it, expect, vi } from "vitest";
import { AnthropicClassificationClient } from "./anthropicClient";
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

function toolUseResponse(input: unknown) {
  return new Response(
    JSON.stringify({
      content: [{ type: "tool_use", name: "classify_product", id: "toolu_1", input }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

describe("AnthropicClassificationClient", () => {
  it("throws immediately when no API key is configured, without calling fetch", async () => {
    const fetchImpl = vi.fn();
    const client = new AnthropicClassificationClient({ apiKey: null, fetchImpl });

    await expect(client.classify(PRODUCT, TAXONOMY)).rejects.toThrow(/ANTHROPIC_API_KEY/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends the api key, version header, and forced tool_choice", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl.mockImplementation(async () => toolUseResponse({ activityId: "act-coffee" }));
    const client = new AnthropicClassificationClient({ apiKey: "test-key", fetchImpl });

    await client.classify(PRODUCT, TAXONOMY);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    const headers = init!.headers as Record<string, string>;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(headers["x-api-key"]).toBe("test-key");
    expect(headers["anthropic-version"]).toBeTruthy();
    const body = JSON.parse(init!.body as string);
    expect(body.tool_choice).toEqual({ type: "tool", name: "classify_product" });
    expect(body.tools[0].name).toBe("classify_product");
  });

  it("includes the taxonomy's real ids and the product name in the prompt", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl.mockImplementation(async () => toolUseResponse({}));
    const client = new AnthropicClassificationClient({ apiKey: "test-key", fetchImpl });

    await client.classify(PRODUCT, TAXONOMY);

    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init!.body as string);
    const promptText = body.messages[0].content as string;
    expect(promptText).toContain("act-coffee");
    expect(promptText).toContain("cat-machines");
    expect(promptText).toContain("Espresso Machine");
  });

  it("returns the tool_use block's input, unvalidated", async () => {
    const input = { activityId: "act-coffee", categoryIds: ["cat-machines"], confidence: 0.8 };
    const fetchImpl = vi.fn(async () => toolUseResponse(input));
    const client = new AnthropicClassificationClient({ apiKey: "test-key", fetchImpl });

    const result = await client.classify(PRODUCT, TAXONOMY);
    expect(result).toEqual(input);
  });

  it("throws when the response has no tool_use block", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ content: [{ type: "text", text: "I refuse." }] }), { status: 200 })
    );
    const client = new AnthropicClassificationClient({ apiKey: "test-key", fetchImpl });

    await expect(client.classify(PRODUCT, TAXONOMY)).rejects.toThrow(/tool call/);
  });

  it("does not retry a 401 (non-transient)", async () => {
    const fetchImpl = vi.fn(async () => new Response("unauthorized", { status: 401 }));
    const client = new AnthropicClassificationClient({ apiKey: "bad-key", fetchImpl });

    await expect(client.classify(PRODUCT, TAXONOMY)).rejects.toThrow(/401/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a transient 529 (overloaded) and succeeds", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) return new Response("overloaded", { status: 529 });
      return toolUseResponse({ activityId: "act-coffee" });
    });
    const client = new AnthropicClassificationClient({ apiKey: "test-key", fetchImpl });

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
    const client = new AnthropicClassificationClient({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 25,
    });

    await expect(client.classify(PRODUCT, TAXONOMY)).rejects.toThrow(/timed out/i);
  }, 10_000);

  it("uses the configured model override", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl.mockImplementation(async () => toolUseResponse({}));
    const client = new AnthropicClassificationClient({ apiKey: "test-key", model: "custom-model", fetchImpl });

    await client.classify(PRODUCT, TAXONOMY);

    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.model).toBe("custom-model");
  });
});
