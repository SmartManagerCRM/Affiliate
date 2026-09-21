import { describe, it, expect } from "vitest";
import { isOptimizableImageSrc } from "./image";

const SUPABASE_HOST = "abcdefgh.supabase.co";

describe("isOptimizableImageSrc", () => {
  it("treats a local path as optimizable", () => {
    expect(isOptimizableImageSrc("/placeholder/foo?title=Foo", SUPABASE_HOST)).toBe(true);
    expect(isOptimizableImageSrc("/logo.png", SUPABASE_HOST)).toBe(true);
  });

  it("treats a URL on the allow-listed Supabase storage host as optimizable", () => {
    expect(
      isOptimizableImageSrc(`https://${SUPABASE_HOST}/storage/v1/object/public/product-images/p1/img.jpg`, SUPABASE_HOST)
    ).toBe(true);
  });

  it("treats a raw external feed image URL as not optimizable", () => {
    expect(isOptimizableImageSrc("https://cdn.some-retailer.example/images/product123.jpg", SUPABASE_HOST)).toBe(false);
  });

  it("treats a malformed URL as not optimizable rather than throwing", () => {
    expect(isOptimizableImageSrc("not a url", SUPABASE_HOST)).toBe(false);
  });

  it("treats every external host as not optimizable when no Supabase host is configured", () => {
    expect(isOptimizableImageSrc(`https://${SUPABASE_HOST}/storage/v1/object/public/x.jpg`, undefined)).toBe(false);
  });
});
