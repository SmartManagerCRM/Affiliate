import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isClassificationConfigured, createClassificationClient } from "./provider";
import { GeminiClassificationClient } from "./geminiClient";
import { AnthropicClassificationClient } from "./anthropicClient";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.GEMINI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
}

describe("classification provider", () => {
  beforeEach(resetEnv);
  afterEach(resetEnv);

  it("reports unconfigured when neither key is set", () => {
    expect(isClassificationConfigured()).toBe(false);
    expect(() => createClassificationClient()).toThrow(/GEMINI_API_KEY or ANTHROPIC_API_KEY/);
  });

  it("prefers Gemini when both are configured", () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.ANTHROPIC_API_KEY = "anthropic-key";

    expect(isClassificationConfigured()).toBe(true);
    expect(createClassificationClient()).toBeInstanceOf(GeminiClassificationClient);
  });

  it("falls back to Anthropic when only that's configured", () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-key";

    expect(isClassificationConfigured()).toBe(true);
    expect(createClassificationClient()).toBeInstanceOf(AnthropicClassificationClient);
  });

  it("uses Gemini when only that's configured", () => {
    process.env.GEMINI_API_KEY = "gemini-key";

    expect(isClassificationConfigured()).toBe(true);
    expect(createClassificationClient()).toBeInstanceOf(GeminiClassificationClient);
  });
});
