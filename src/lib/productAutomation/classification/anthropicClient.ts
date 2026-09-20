import "server-only";

import type { NormalizedProduct } from "../types";
import type { ClassificationTaxonomy } from "./classificationStore";
import { withRetry, errorForResponse, fetchWithTimeout } from "../httpRetry";

/**
 * Calls Anthropic's Messages API (a real, stable, documented public API —
 * unlike Admitad's OAuth endpoint in Phase 2, nothing here is a guess) with
 * a forced tool call, so the model's response is always structured JSON
 * rather than free text that has to be parsed out of prose. The taxonomy is
 * given to the model as the ONLY valid activity/category ids — it's asked
 * to choose from that list, never to invent one. Schema validation
 * (schema.ts) still double-checks the response against the real taxonomy
 * before anything is stored, since tool-use guarantees well-formed JSON
 * but not that the ids inside it are real.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TIMEOUT_MS = 30_000;

export function getAnthropicApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY?.trim() || null;
}

export function isClassificationConfigured(): boolean {
  return Boolean(getAnthropicApiKey());
}

const CLASSIFY_TOOL = {
  name: "classify_product",
  description:
    "Records the activity, categories, country relevance, confidence, and reasoning for classifying an affiliate product.",
  input_schema: {
    type: "object",
    properties: {
      activityId: {
        type: "string",
        description: "The id of the single best-matching activity from the provided list.",
      },
      categoryIds: {
        type: "array",
        items: { type: "string" },
        description: "Ids of matching categories from the provided list. Each must belong to activityId.",
      },
      countries: {
        type: "array",
        items: { type: "string" },
        description:
          'ISO 3166-1 alpha-2 country codes this product is most relevant to, or ["GLOBAL"] if it is not region-specific.',
      },
      confidence: {
        type: "number",
        description: "Confidence in this classification, from 0 to 1.",
      },
      reason: {
        type: "string",
        description: "A one or two sentence explanation for this classification.",
      },
    },
    required: ["activityId", "categoryIds", "countries", "confidence", "reason"],
  },
} as const;

function buildPrompt(product: NormalizedProduct, taxonomy: ClassificationTaxonomy): string {
  const activitiesList = taxonomy.activities.map((a) => `- ${a.id}: ${a.name}`).join("\n");
  const categoriesList = taxonomy.categories.map((c) => `- ${c.id}: ${c.name} (activity: ${c.activityId})`).join("\n");

  const lines = [
    "Classify this affiliate product using ONLY the activity and category ids listed below.",
    "Never invent an id that isn't listed. Pick the single best-matching activity, and only",
    "categories that belong to it.",
    "",
    `Product name: ${product.name}`,
    product.brand ? `Brand: ${product.brand}` : null,
    product.description ? `Description: ${product.description}` : null,
    "",
    "Available activities (id: name):",
    activitiesList || "(none)",
    "",
    "Available categories (id: name (activity: activityId)):",
    categoriesList || "(none)",
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}

type AnthropicToolUseBlock = { type: "tool_use"; name: string; input: unknown };
type AnthropicContentBlock = { type: string; [key: string]: unknown };
type AnthropicMessagesResponse = { content?: AnthropicContentBlock[] };

function isToolUseBlock(block: AnthropicContentBlock): block is AnthropicToolUseBlock {
  return block.type === "tool_use" && block.name === CLASSIFY_TOOL.name;
}

export type AnthropicClassificationClientOptions = {
  apiKey?: string | null;
  model?: string;
  /** Injectable so tests never hit a real network. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export class AnthropicClassificationClient {
  private readonly apiKey: string | null;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: AnthropicClassificationClientOptions = {}) {
    this.apiKey = options.apiKey ?? getAnthropicApiKey();
    this.model = options.model ?? process.env.ANTHROPIC_CLASSIFICATION_MODEL?.trim() ?? DEFAULT_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Returns the tool call's raw input — NOT yet validated against the real taxonomy; the caller must run it through validateClassificationResult. */
  async classify(product: NormalizedProduct, taxonomy: ClassificationTaxonomy): Promise<unknown> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured.");
    }

    const requestBody = {
      model: this.model,
      max_tokens: DEFAULT_MAX_TOKENS,
      tools: [CLASSIFY_TOOL],
      tool_choice: { type: "tool", name: CLASSIFY_TOOL.name },
      messages: [{ role: "user", content: buildPrompt(product, taxonomy) }],
    };

    const data = await withRetry(async () => {
      const response = await fetchWithTimeout(
        this.fetchImpl,
        ANTHROPIC_API_URL,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": this.apiKey as string,
            "anthropic-version": ANTHROPIC_VERSION,
          },
          body: JSON.stringify(requestBody),
        },
        this.timeoutMs
      );
      if (!response.ok) throw errorForResponse(response);
      return (await response.json()) as AnthropicMessagesResponse;
    });

    const toolUse = (data.content ?? []).find(isToolUseBlock);
    if (!toolUse) {
      throw new Error("Anthropic response did not include a classify_product tool call.");
    }
    return toolUse.input;
  }
}
