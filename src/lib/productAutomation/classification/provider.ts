import "server-only";

import type { ClassificationClient } from "./classifyEngine";
import { AnthropicClassificationClient, isClassificationConfigured as isAnthropicConfigured } from "./anthropicClient";
import { GeminiClassificationClient, isGeminiConfigured } from "./geminiClient";

/**
 * Single place the sync pipeline/admin actions ask "is classification
 * available, and with what?" — never construct a provider client directly
 * elsewhere. Gemini is checked first since it's the account's chosen
 * (genuinely free) provider; Anthropic still works as a fallback if
 * ANTHROPIC_API_KEY is ever set instead/as well, so switching providers is
 * just an env var change, not a code change.
 */
export function isClassificationConfigured(): boolean {
  return isGeminiConfigured() || isAnthropicConfigured();
}

/** Throws if neither provider is configured — callers must check isClassificationConfigured() first, matching every other call site's existing guard. */
export function createClassificationClient(): ClassificationClient {
  if (isGeminiConfigured()) return new GeminiClassificationClient();
  if (isAnthropicConfigured()) return new AnthropicClassificationClient();
  throw new Error("No classification provider is configured: set GEMINI_API_KEY or ANTHROPIC_API_KEY.");
}
