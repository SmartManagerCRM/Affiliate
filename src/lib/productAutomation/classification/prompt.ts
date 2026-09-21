import type { NormalizedProduct } from "../types";
import type { ClassificationTaxonomy } from "./classificationStore";

/** Provider-agnostic — every classification client (Anthropic, Gemini, ...) builds its request around this same instruction/product/taxonomy text. */
export function buildClassificationPrompt(product: NormalizedProduct, taxonomy: ClassificationTaxonomy): string {
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
