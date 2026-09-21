import type { TopProductRow } from "@/lib/adminAnalytics";

/**
 * Pure aggregation over already-fetched affiliate_clicks rows — kept
 * separate from the Supabase query (lib/adminAnalytics.ts's
 * getAutomationPerformance) so the actual "how do we honestly summarize
 * performance" logic is unit-testable without a database.
 *
 * Phase 9's explicit rule: real affiliate_clicks-derived metrics only.
 * There is no conversion/order/revenue table anywhere in this schema, so
 * this never computes or returns a conversion rate, EPC, or revenue
 * figure — only real click counts. `productsWithoutClicks` exists
 * specifically so a caller can render "No performance data yet" for that
 * cohort, rather than omitting them and implying performance data was
 * considered and simply came back empty.
 */

export type ClickRow = {
  productId: string;
  name: string;
  mainImage: string | null;
};

export type AutomationPerformanceSummary = {
  totalClicks: number;
  automationProductCount: number;
  productsWithClicks: number;
  productsWithoutClicks: number;
  topProducts: TopProductRow[];
};

export function summarizeAutomationClicks(productIds: string[], clickRows: ClickRow[]): AutomationPerformanceSummary {
  const productIdSet = new Set(productIds);
  const byProduct = new Map<string, TopProductRow>();
  let totalClicks = 0;

  for (const row of clickRows) {
    // Defensive: only ever count a click toward an automation product this
    // caller actually asked about. The real query already filters by
    // product_id .in(productIds), but this keeps the pure function correct
    // on its own, regardless of what the caller passes in.
    if (!productIdSet.has(row.productId)) continue;

    totalClicks += 1;
    const existing = byProduct.get(row.productId);
    if (existing) {
      existing.clicks += 1;
    } else {
      byProduct.set(row.productId, { productId: row.productId, name: row.name, mainImage: row.mainImage, clicks: 1 });
    }
  }

  const productsWithClicks = byProduct.size;

  return {
    totalClicks,
    automationProductCount: productIds.length,
    productsWithClicks,
    productsWithoutClicks: productIds.length - productsWithClicks,
    topProducts: Array.from(byProduct.values()).sort((a, b) => b.clicks - a.clicks),
  };
}
