import { describe, it, expect } from "vitest";
import { generateCartSessionToken } from "./token";

describe("generateCartSessionToken", () => {
  it("produces a base64url string with no padding/unsafe characters", () => {
    const token = generateCartSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("produces 256 bits of entropy (43-44 base64url characters for 32 bytes)", () => {
    const token = generateCartSessionToken();
    expect(token.length).toBeGreaterThanOrEqual(42);
    expect(token.length).toBeLessThanOrEqual(44);
  });

  it("never repeats across many calls", () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => generateCartSessionToken()));
    expect(tokens.size).toBe(1000);
  });
});
