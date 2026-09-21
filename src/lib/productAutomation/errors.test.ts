import { describe, it, expect } from "vitest";
import { classifyErrorSource } from "./errors";
import { AUTO_UPDATE_OFFER_ERROR, AUTO_UPDATE_PRODUCT_ERROR } from "./update/autoUpdateEngine";

describe("classifyErrorSource", () => {
  it("classifies auto-update offer write failures as auto_update", () => {
    expect(classifyErrorSource(AUTO_UPDATE_OFFER_ERROR)).toBe("auto_update");
  });

  it("classifies auto-update product write failures as auto_update", () => {
    expect(classifyErrorSource(AUTO_UPDATE_PRODUCT_ERROR)).toBe("auto_update");
  });

  it("classifies every other error_type (validation failures, sync_failure, etc.) as sync", () => {
    expect(classifyErrorSource("invalid_price")).toBe("sync");
    expect(classifyErrorSource("sync_failure")).toBe("sync");
    expect(classifyErrorSource("missing_affiliate_url")).toBe("sync");
  });
});
