import { describe, it, expect } from "vitest";
import { isSyncDue } from "./schedule";

describe("isSyncDue", () => {
  it("is due when there is no prior completed sync", () => {
    expect(isSyncDue(null, 6)).toBe(true);
  });

  it("is not due when less time than the interval has elapsed", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const lastCompletedAt = "2026-01-01T08:00:00.000Z"; // 4h ago
    expect(isSyncDue(lastCompletedAt, 6, now)).toBe(false);
  });

  it("is due once exactly the interval has elapsed", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const lastCompletedAt = "2026-01-01T06:00:00.000Z"; // exactly 6h ago
    expect(isSyncDue(lastCompletedAt, 6, now)).toBe(true);
  });

  it("is due once more time than the interval has elapsed", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const lastCompletedAt = "2026-01-01T00:00:00.000Z"; // 12h ago
    expect(isSyncDue(lastCompletedAt, 6, now)).toBe(true);
  });

  it("respects a different configured interval", () => {
    const now = new Date("2026-01-01T01:00:00.000Z");
    const lastCompletedAt = "2026-01-01T00:00:00.000Z"; // 1h ago
    expect(isSyncDue(lastCompletedAt, 24, now)).toBe(false);
    expect(isSyncDue(lastCompletedAt, 1, now)).toBe(true);
  });

  it("treats a future lastCompletedAt (clock skew) as not due, never throws", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const lastCompletedAt = "2026-01-01T01:00:00.000Z"; // 1h in the future
    expect(() => isSyncDue(lastCompletedAt, 6, now)).not.toThrow();
    expect(isSyncDue(lastCompletedAt, 6, now)).toBe(false);
  });
});
