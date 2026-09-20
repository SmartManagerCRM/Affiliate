import { describe, it, expect } from "vitest";
import { isLockActive } from "./syncLock";

describe("isLockActive", () => {
  it("is not active when there is no locked_at", () => {
    expect(isLockActive(null)).toBe(false);
  });

  it("is active when locked_at is recent", () => {
    const now = new Date("2026-01-01T00:30:00.000Z");
    const lockedAt = "2026-01-01T00:00:00.000Z"; // 30 minutes ago
    expect(isLockActive(lockedAt, 60, now)).toBe(true);
  });

  it("is not active once locked_at is past the staleness window", () => {
    const now = new Date("2026-01-01T01:00:00.000Z");
    const lockedAt = "2026-01-01T00:00:00.000Z"; // 60 minutes ago
    expect(isLockActive(lockedAt, 30, now)).toBe(false);
  });

  it("uses the default staleness window when not specified", () => {
    const now = new Date();
    const recentLock = new Date(now.getTime() - 5 * 60_000).toISOString(); // 5 minutes ago
    expect(isLockActive(recentLock, undefined, now)).toBe(true);
  });
});
