import type { NormalizedProduct } from "./types";

/**
 * Pure, DB-free duplicate-identity scoring. Conservative by design: only a
 * fixed set of signal combinations ever produces a non-zero score, and the
 * caller decides the review threshold — nothing here ever "merges" two
 * records, it only scores how alike they look so a human can decide.
 */

export type IdentitySignals = {
  gtin: string | null;
  sku: string | null;
  brand: string | null;
  model: string | null;
  normalizedName: string;
};

function normalizeToken(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

/** Lowercases, strips accents/punctuation, and collapses whitespace — a stable basis for exact-name comparison. */
export function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function extractIdentitySignals(product: NormalizedProduct): IdentitySignals {
  return {
    gtin: normalizeToken(product.gtin),
    sku: normalizeToken(product.sku),
    brand: normalizeToken(product.brand),
    model: normalizeToken(product.model),
    normalizedName: normalizeNameForMatch(product.name),
  };
}

export type IdentityMatch = {
  confidence: number;
  signals: string[];
};

/**
 * Below this, a match isn't surfaced at all — under-flagging is the safe
 * failure mode for a "never auto-merge" system; a false negative just means
 * two candidates stay separate for a human to notice later, a false
 * positive wastes review time on unrelated products.
 */
export const MIN_REVIEW_CONFIDENCE = 45;

/**
 * Scores how likely `a` and `b` are the same product. Each rule requires an
 * exact match on real (non-empty) values on both sides — nothing here does
 * fuzzy/typo-tolerant string comparison, which is a deliberate scope limit
 * (see dedupEngine.ts's module comment) rather than an oversight.
 */
export function scoreIdentityMatch(a: IdentitySignals, b: IdentitySignals): IdentityMatch {
  if (a.gtin && b.gtin && a.gtin === b.gtin) {
    return { confidence: 100, signals: ["gtin"] };
  }

  const brandMatch = Boolean(a.brand && b.brand && a.brand === b.brand);
  let confidence = 0;
  const signals = new Set<string>();

  if (a.sku && b.sku && a.sku === b.sku) {
    confidence = Math.max(confidence, brandMatch ? 90 : 70);
    signals.add("sku");
    if (brandMatch) signals.add("brand");
  }

  if (a.model && b.model && a.model === b.model && brandMatch) {
    confidence = Math.max(confidence, 80);
    signals.add("model");
    signals.add("brand");
  }

  if (a.normalizedName && b.normalizedName && a.normalizedName === b.normalizedName) {
    confidence = Math.max(confidence, brandMatch ? 65 : 45);
    signals.add("name");
    if (brandMatch) signals.add("brand");
  }

  return { confidence, signals: Array.from(signals) };
}

export type MatchCandidate<T> = {
  ref: T;
  signals: IdentitySignals;
};

export type BestMatch<T> = {
  ref: T;
  confidence: number;
  signals: string[];
};

/** Returns the single highest-confidence candidate, or null if none scored above zero. */
export function pickBestMatch<T>(target: IdentitySignals, candidates: MatchCandidate<T>[]): BestMatch<T> | null {
  let best: BestMatch<T> | null = null;

  for (const candidate of candidates) {
    const { confidence, signals } = scoreIdentityMatch(target, candidate.signals);
    if (confidence > 0 && (!best || confidence > best.confidence)) {
      best = { ref: candidate.ref, confidence, signals };
    }
  }

  return best;
}
