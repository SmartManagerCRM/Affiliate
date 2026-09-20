import type { ClassificationTaxonomy } from "./classificationStore";

/**
 * Validates an AI classification response against the real taxonomy —
 * this is the safety net that stops a hallucinated activity/category id
 * (or an out-of-range confidence, or a malformed country code) from ever
 * being stored. Nothing here ever executes the response as SQL or any
 * other code — it's plain structural/membership checks, and the only
 * effect of a valid result is a set of plain values handed to a
 * parameterized Supabase update.
 */

export type ValidClassification = {
  activityId: string;
  categoryIds: string[];
  countries: string[];
  confidence: number;
  reason: string;
};

export type ClassificationValidationResult =
  | { valid: true; result: ValidClassification }
  | { valid: false; errorMessage: string };

const COUNTRY_CODE_RE = /^[A-Z]{2}$/;
const MAX_REASON_LENGTH = 2000;

export function validateClassificationResult(
  raw: unknown,
  taxonomy: ClassificationTaxonomy
): ClassificationValidationResult {
  if (!raw || typeof raw !== "object") {
    return { valid: false, errorMessage: "Classification response was not an object." };
  }
  const obj = raw as Record<string, unknown>;

  const activityId = obj.activityId;
  if (typeof activityId !== "string" || !activityId.trim()) {
    return { valid: false, errorMessage: "Classification response is missing a valid activityId." };
  }
  if (!taxonomy.activities.some((a) => a.id === activityId)) {
    return { valid: false, errorMessage: `activityId "${activityId}" is not a known activity.` };
  }

  const categoryIdsRaw = obj.categoryIds;
  if (!Array.isArray(categoryIdsRaw) || categoryIdsRaw.some((c) => typeof c !== "string")) {
    return { valid: false, errorMessage: "categoryIds must be an array of strings." };
  }
  const categoryIds = categoryIdsRaw as string[];
  for (const categoryId of categoryIds) {
    const category = taxonomy.categories.find((c) => c.id === categoryId);
    if (!category) {
      return { valid: false, errorMessage: `categoryId "${categoryId}" is not a known category.` };
    }
    if (category.activityId !== activityId) {
      return {
        valid: false,
        errorMessage: `categoryId "${categoryId}" does not belong to activity "${activityId}".`,
      };
    }
  }

  const countriesRaw = obj.countries;
  if (!Array.isArray(countriesRaw) || countriesRaw.length === 0 || countriesRaw.some((c) => typeof c !== "string")) {
    return { valid: false, errorMessage: "countries must be a non-empty array of strings." };
  }
  const countries = countriesRaw as string[];
  for (const country of countries) {
    if (country !== "GLOBAL" && !COUNTRY_CODE_RE.test(country)) {
      return {
        valid: false,
        errorMessage: `"${country}" is not a valid country code (expected a 2-letter ISO code or "GLOBAL").`,
      };
    }
  }

  const confidence = obj.confidence;
  if (typeof confidence !== "number" || Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
    return { valid: false, errorMessage: "confidence must be a number between 0 and 1." };
  }

  const reason = obj.reason;
  if (typeof reason !== "string" || !reason.trim()) {
    return { valid: false, errorMessage: "reason must be a non-empty string." };
  }
  if (reason.length > MAX_REASON_LENGTH) {
    return { valid: false, errorMessage: `reason exceeds ${MAX_REASON_LENGTH} characters.` };
  }

  return {
    valid: true,
    result: { activityId, categoryIds, countries, confidence, reason: reason.trim() },
  };
}
