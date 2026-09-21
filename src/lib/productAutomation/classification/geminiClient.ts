import "server-only";

import type { NormalizedProduct } from "../types";
import type { ClassificationTaxonomy } from "./classificationStore";
import { withRetry, errorForResponse, fetchWithTimeout } from "../httpRetry";
import { buildClassificationPrompt } from "./prompt";

/**
 * Calls Google's Gemini API (generateContent) with a forced JSON schema
 * response, Gemini's equivalent of Anthropic's forced tool call — the model
 * can only return well-formed JSON matching CLASSIFY_SCHEMA, never free
 * text. Chosen as a genuinely free (not just trial-credit) alternative to
 * Anthropic for this task: Gemini's flash-tier models have an ongoing free
 * quota. Schema validation (schema.ts) still double-checks the response
 * against the real activity/category taxonomy before anything is stored,
 * exactly as it does for Anthropic's client — forced-schema output
 * guarantees well-formed JSON but not that the ids inside it are real.
 *
 * Endpoint, auth, and field names below were verified against Google's own
 * published API definitions (googleapis/googleapis's generative_service.proto
 * — the real source of truth for the REST JSON shape: generationConfig /
 * responseMimeType / responseSchema, all camelCase mappings of that proto's
 * snake_case fields) and the official JS SDK's own samples repo
 * (googleapis/js-genai) — ai.google.dev itself is unreachable from this
 * sandbox's network egress policy, so those two direct, authoritative
 * GitHub sources were used instead of guessing. MODEL: gemini-flash-latest
 * — Google's own floating alias to their current recommended free-tier
 * flash model (confirmed verbatim in js-genai's README), chosen specifically
 * so this never silently breaks when Google renames/retires a dated model
 * version. Override with GEMINI_CLASSIFICATION_MODEL to pin a specific one.
 */

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-flash-latest";
const DEFAULT_TIMEOUT_MS = 30_000;

export function getGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

const CLASSIFY_SCHEMA = {
  type: "OBJECT",
  properties: {
    activityId: {
      type: "STRING",
      description: "The id of the single best-matching activity from the provided list.",
    },
    categoryIds: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Ids of matching categories from the provided list. Each must belong to activityId.",
    },
    countries: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: 'ISO 3166-1 alpha-2 country codes this product is most relevant to, or ["GLOBAL"] if it is not region-specific.',
    },
    confidence: {
      type: "NUMBER",
      description: "Confidence in this classification, from 0 to 1.",
    },
    reason: {
      type: "STRING",
      description: "A one or two sentence explanation for this classification.",
    },
  },
  required: ["activityId", "categoryIds", "countries", "confidence", "reason"],
} as const;

type GeminiPart = { text?: string };
type GeminiCandidate = { content?: { parts?: GeminiPart[] } };
type GeminiGenerateContentResponse = { candidates?: GeminiCandidate[] };

export type GeminiClassificationClientOptions = {
  apiKey?: string | null;
  model?: string;
  /** Injectable so tests never hit a real network. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export class GeminiClassificationClient {
  private readonly apiKey: string | null;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: GeminiClassificationClientOptions = {}) {
    this.apiKey = options.apiKey ?? getGeminiApiKey();
    this.model = options.model ?? process.env.GEMINI_CLASSIFICATION_MODEL?.trim() ?? DEFAULT_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Returns the parsed JSON response — NOT yet validated against the real taxonomy; the caller must run it through validateClassificationResult. */
  async classify(product: NormalizedProduct, taxonomy: ClassificationTaxonomy): Promise<unknown> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const requestBody = {
      contents: [{ role: "user", parts: [{ text: buildClassificationPrompt(product, taxonomy) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: CLASSIFY_SCHEMA,
      },
    };

    const data = await withRetry(async () => {
      const response = await fetchWithTimeout(
        this.fetchImpl,
        `${GEMINI_API_BASE_URL}/models/${this.model}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": this.apiKey as string,
          },
          body: JSON.stringify(requestBody),
        },
        this.timeoutMs
      );
      if (!response.ok) throw errorForResponse(response);
      return (await response.json()) as GeminiGenerateContentResponse;
    });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini response did not include any generated text.");
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Gemini response text was not valid JSON.");
    }
  }
}
