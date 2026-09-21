import { describe, it, expect } from "vitest";
import { describeAutoUpdateRun } from "./describeAutoUpdateRun";
import type { AutoUpdateSummary } from "./autoUpdateEngine";

function summary(overrides: Partial<AutoUpdateSummary> = {}): AutoUpdateSummary {
  return { candidatesChecked: 0, offersUpdated: 0, offersSkippedManual: 0, productsUpdated: 0, errors: 0, ...overrides };
}

describe("describeAutoUpdateRun", () => {
  it("reports nothing to check when there are no approved candidates", () => {
    expect(describeAutoUpdateRun(summary())).toBe("Auto-update: no approved products to check.");
  });

  it("summarizes a clean run with no errors", () => {
    const line = describeAutoUpdateRun(
      summary({ candidatesChecked: 5, offersUpdated: 3, productsUpdated: 2, offersSkippedManual: 1 })
    );
    expect(line).toBe("Auto-update: 3 offer(s) refreshed, 2 product(s) updated, 1 skipped (manually controlled).");
    expect(line).not.toContain("error");
  });

  it("appends an error count when writes failed during the run", () => {
    const line = describeAutoUpdateRun(
      summary({ candidatesChecked: 5, offersUpdated: 2, productsUpdated: 2, offersSkippedManual: 0, errors: 2 })
    );
    expect(line).toBe(
      "Auto-update: 2 offer(s) refreshed, 2 product(s) updated, 0 skipped (manually controlled). 2 error(s) — see Recent Errors on this page."
    );
  });

  it("appends the error count even when it's exactly one", () => {
    const line = describeAutoUpdateRun(summary({ candidatesChecked: 1, errors: 1 }));
    expect(line).toContain("1 error(s) — see Recent Errors on this page.");
  });
});
