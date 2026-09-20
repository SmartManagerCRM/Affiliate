import { describe, it, expect, vi } from "vitest";
import { classifyOne, classifyPendingProducts, describeClassificationRun } from "./classifyEngine";
import type { ClassificationClient } from "./classifyEngine";
import type {
  ClassificationResult,
  ClassificationStore,
  ClassificationTaxonomy,
  PendingClassificationCandidate,
} from "./classificationStore";
import type { NormalizedProduct } from "../types";

const TAXONOMY: ClassificationTaxonomy = {
  activities: [{ id: "act-coffee", name: "Coffee" }],
  categories: [{ id: "cat-machines", name: "Espresso Machines", activityId: "act-coffee" }],
};

const PRODUCT: NormalizedProduct = {
  externalProductId: "p-1",
  name: "Espresso Machine",
  images: [],
  raw: {},
  offers: [],
};

const VALID_RESPONSE = {
  activityId: "act-coffee",
  categoryIds: ["cat-machines"],
  countries: ["GLOBAL"],
  confidence: 0.9,
  reason: "It's an espresso machine.",
};

class InMemoryClassificationStore implements ClassificationStore {
  candidates: PendingClassificationCandidate[] = [];
  results = new Map<string, ClassificationResult>();

  async loadTaxonomy(): Promise<ClassificationTaxonomy> {
    return TAXONOMY;
  }

  async findPendingCandidates(limit: number): Promise<PendingClassificationCandidate[]> {
    return this.candidates.slice(0, limit);
  }

  async updateClassificationResult(importSourceId: string, result: ClassificationResult): Promise<void> {
    this.results.set(importSourceId, result);
  }
}

describe("classifyOne", () => {
  it("classifies successfully on the first attempt", async () => {
    const client: ClassificationClient = { classify: vi.fn(async () => VALID_RESPONSE) };
    const result = await classifyOne(client, PRODUCT, TAXONOMY);

    expect(result.status).toBe("classified");
    if (result.status === "classified") {
      expect(result.activityId).toBe("act-coffee");
      expect(result.attempts).toBe(1);
    }
    expect(client.classify).toHaveBeenCalledTimes(1);
  });

  it("retries once when the first response fails schema validation, then succeeds", async () => {
    let calls = 0;
    const client: ClassificationClient = {
      classify: vi.fn(async () => {
        calls += 1;
        if (calls === 1) return { activityId: "not-a-real-activity" };
        return VALID_RESPONSE;
      }),
    };

    const result = await classifyOne(client, PRODUCT, TAXONOMY);

    expect(result.status).toBe("classified");
    if (result.status === "classified") expect(result.attempts).toBe(2);
    expect(client.classify).toHaveBeenCalledTimes(2);
  });

  it("marks classification_failed after two invalid attempts — never a third try", async () => {
    const client: ClassificationClient = { classify: vi.fn(async () => ({ activityId: "bogus" })) };

    const result = await classifyOne(client, PRODUCT, TAXONOMY);

    expect(result.status).toBe("classification_failed");
    if (result.status === "classification_failed") expect(result.attempts).toBe(2);
    expect(client.classify).toHaveBeenCalledTimes(2);
  });

  it("treats a thrown error the same as an invalid response and retries once", async () => {
    let calls = 0;
    const client: ClassificationClient = {
      classify: vi.fn(async () => {
        calls += 1;
        if (calls === 1) throw new Error("API error");
        return VALID_RESPONSE;
      }),
    };

    const result = await classifyOne(client, PRODUCT, TAXONOMY);
    expect(result.status).toBe("classified");
    expect(client.classify).toHaveBeenCalledTimes(2);
  });

  it("marks classification_failed with the error message when both attempts throw", async () => {
    const client: ClassificationClient = {
      classify: vi.fn(async () => {
        throw new Error("persistent API failure");
      }),
    };

    const result = await classifyOne(client, PRODUCT, TAXONOMY);
    expect(result.status).toBe("classification_failed");
    if (result.status === "classification_failed") {
      expect(result.error).toBe("persistent API failure");
    }
  });

  it("never returns a partial/fabricated classified result on failure", async () => {
    const client: ClassificationClient = { classify: vi.fn(async () => ({ garbage: true })) };
    const result = await classifyOne(client, PRODUCT, TAXONOMY);
    expect(result.status).toBe("classification_failed");
    expect(Object.keys(result)).not.toContain("activityId");
  });
});

describe("classifyPendingProducts", () => {
  it("classifies every pending candidate and tallies the summary", async () => {
    const store = new InMemoryClassificationStore();
    store.candidates = [
      { importSourceId: "src-1", product: { ...PRODUCT, externalProductId: "p-1" } },
      { importSourceId: "src-2", product: { ...PRODUCT, externalProductId: "p-2" } },
    ];
    const client: ClassificationClient = { classify: vi.fn(async () => VALID_RESPONSE) };

    const summary = await classifyPendingProducts(store, client);

    expect(summary).toEqual({ candidatesFound: 2, classified: 2, failed: 0 });
    expect(store.results.get("src-1")?.status).toBe("classified");
    expect(store.results.get("src-2")?.status).toBe("classified");
  });

  it("tallies both classified and failed candidates in one run", async () => {
    const store = new InMemoryClassificationStore();
    store.candidates = [
      { importSourceId: "good", product: PRODUCT },
      { importSourceId: "bad", product: PRODUCT },
    ];
    let call = 0;
    const client: ClassificationClient = {
      classify: vi.fn(async () => {
        call += 1;
        // "good" gets two valid calls (never needed), "bad" always invalid.
        return call <= 1 ? VALID_RESPONSE : { activityId: "nonsense" };
      }),
    };

    const summary = await classifyPendingProducts(store, client);
    expect(summary.candidatesFound).toBe(2);
    expect(summary.classified + summary.failed).toBe(2);
  });

  it("respects the batch limit", async () => {
    const store = new InMemoryClassificationStore();
    store.candidates = Array.from({ length: 10 }, (_, i) => ({
      importSourceId: `src-${i}`,
      product: PRODUCT,
    }));
    const client: ClassificationClient = { classify: vi.fn(async () => VALID_RESPONSE) };

    const summary = await classifyPendingProducts(store, client, { limit: 3 });
    expect(summary.candidatesFound).toBe(3);
    expect(client.classify).toHaveBeenCalledTimes(3);
  });

  it("returns zero counts when there is nothing pending", async () => {
    const store = new InMemoryClassificationStore();
    const client: ClassificationClient = { classify: vi.fn() };

    const summary = await classifyPendingProducts(store, client);
    expect(summary).toEqual({ candidatesFound: 0, classified: 0, failed: 0 });
    expect(client.classify).not.toHaveBeenCalled();
  });

  it("never writes anything but the two known statuses", async () => {
    const store = new InMemoryClassificationStore();
    store.candidates = [{ importSourceId: "src-1", product: PRODUCT }];
    const client: ClassificationClient = { classify: vi.fn(async () => VALID_RESPONSE) };

    await classifyPendingProducts(store, client);
    const result = store.results.get("src-1");
    expect(["classified", "classification_failed"]).toContain(result?.status);
  });
});

describe("describeClassificationRun", () => {
  it("reports nothing pending", () => {
    expect(describeClassificationRun({ candidatesFound: 0, classified: 0, failed: 0 })).toMatch(/nothing pending/);
  });

  it("reports classified/failed counts", () => {
    const message = describeClassificationRun({ candidatesFound: 5, classified: 3, failed: 2 });
    expect(message).toContain("3 classified");
    expect(message).toContain("2 failed");
    expect(message).toContain("5 pending");
  });
});
