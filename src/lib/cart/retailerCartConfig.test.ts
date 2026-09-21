import { describe, expect, it } from "vitest";
import { parseRetailerCartConfig } from "@/lib/cart/retailerCartConfig";

const base = {
  supportsMultiProductCart: false,
  cartLinkType: "none",
  cartLinkTemplate: "",
  cartConfigJson: "",
};

describe("parseRetailerCartConfig", () => {
  it("accepts the default (no multi-cart support, no strategy)", () => {
    const result = parseRetailerCartConfig(base);
    expect(result).toEqual({
      ok: true,
      cartLinkType: "none",
      cartLinkTemplate: null,
      cartConfig: {},
    });
  });

  it("falls back to 'none' for an unrecognized cart_link_type value", () => {
    const result = parseRetailerCartConfig({ ...base, cartLinkType: "not-a-real-type" });
    expect(result).toEqual({ ok: true, cartLinkType: "none", cartLinkTemplate: null, cartConfig: {} });
  });

  it("rejects supports_multi_product_cart=true with cart_link_type='none' (mirrors the DB CHECK)", () => {
    const result = parseRetailerCartConfig({ ...base, supportsMultiProductCart: true, cartLinkType: "none" });
    expect(result).toEqual({
      ok: false,
      error: "Supports multi-product cart requires a cart strategy other than 'None'.",
    });
  });

  it("accepts supports_multi_product_cart=true with a real strategy", () => {
    const result = parseRetailerCartConfig({
      ...base,
      supportsMultiProductCart: true,
      cartLinkType: "static",
      cartLinkTemplate: "https://retailer.example.com/cart",
    });
    expect(result).toEqual({
      ok: true,
      cartLinkType: "static",
      cartLinkTemplate: "https://retailer.example.com/cart",
      cartConfig: {},
    });
  });

  it("accepts supports_multi_product_cart=false paired with a real strategy (pre-configured ahead of time)", () => {
    const result = parseRetailerCartConfig({
      ...base,
      supportsMultiProductCart: false,
      cartLinkType: "static",
      cartLinkTemplate: "https://retailer.example.com/cart",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a malformed cart_link_template URL for the static strategy", () => {
    const result = parseRetailerCartConfig({
      ...base,
      cartLinkType: "static",
      cartLinkTemplate: "not a url",
    });
    expect(result).toEqual({ ok: false, error: "Cart link template must be a valid http(s) URL." });
  });

  it("rejects a non-http(s) cart_link_template URL", () => {
    const result = parseRetailerCartConfig({
      ...base,
      cartLinkType: "static",
      cartLinkTemplate: "ftp://retailer.example.com/cart",
    });
    expect(result).toEqual({ ok: false, error: "Cart link template must be a valid http(s) URL." });
  });

  it("allows a blank cart_link_template for the static strategy (not yet configured)", () => {
    const result = parseRetailerCartConfig({ ...base, cartLinkType: "static", cartLinkTemplate: "" });
    expect(result).toEqual({ ok: true, cartLinkType: "static", cartLinkTemplate: null, cartConfig: {} });
  });

  it("drops cart_link_template for non-static strategies even if one was submitted", () => {
    const result = parseRetailerCartConfig({
      ...base,
      cartLinkType: "dynamic",
      cartLinkTemplate: "https://should-be-ignored.example.com",
    });
    expect(result.ok && result.cartLinkTemplate).toBeNull();
  });

  it("parses cart_config JSON for JSON-config strategies", () => {
    const result = parseRetailerCartConfig({
      ...base,
      cartLinkType: "api",
      cartConfigJson: '{"endpoint":"https://api.example.com"}',
    });
    expect(result).toEqual({
      ok: true,
      cartLinkType: "api",
      cartLinkTemplate: null,
      cartConfig: { endpoint: "https://api.example.com" },
    });
  });

  it("rejects invalid JSON for a JSON-config strategy", () => {
    const result = parseRetailerCartConfig({
      ...base,
      cartLinkType: "custom",
      cartConfigJson: "{not valid json",
    });
    expect(result).toEqual({ ok: false, error: "Cart configuration must be valid JSON." });
  });

  it("drops cart_config for strategies that don't use it, even if JSON was submitted", () => {
    const result = parseRetailerCartConfig({
      ...base,
      cartLinkType: "static",
      cartLinkTemplate: "https://retailer.example.com/cart",
      cartConfigJson: '{"ignored":true}',
    });
    expect(result).toEqual({
      ok: true,
      cartLinkType: "static",
      cartLinkTemplate: "https://retailer.example.com/cart",
      cartConfig: {},
    });
  });

  it("ignores blank cart_config JSON for JSON-config strategies (defaults to {})", () => {
    const result = parseRetailerCartConfig({ ...base, cartLinkType: "platform_specific", cartConfigJson: "  " });
    expect(result).toEqual({
      ok: true,
      cartLinkType: "platform_specific",
      cartLinkTemplate: null,
      cartConfig: {},
    });
  });
});
