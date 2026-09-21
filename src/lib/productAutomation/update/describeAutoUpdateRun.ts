import type { AutoUpdateSummary } from "./autoUpdateEngine";

/**
 * One human-readable line summarizing an auto-update pass — shared by the
 * manual "Sync Approved Products" action and the full sync pipeline
 * (runScheduledSync) so both report the run the same way, rather than two
 * copies of this message drifting apart. Surfaces a real error count
 * instead of staying silent when offer/product writes fail mid-run.
 */
export function describeAutoUpdateRun(summary: AutoUpdateSummary): string {
  if (summary.candidatesChecked === 0) return "Auto-update: no approved products to check.";

  const base = `Auto-update: ${summary.offersUpdated} offer(s) refreshed, ${summary.productsUpdated} product(s) updated, ${summary.offersSkippedManual} skipped (manually controlled).`;

  return summary.errors > 0 ? `${base} ${summary.errors} error(s) — see Recent Errors on this page.` : base;
}
