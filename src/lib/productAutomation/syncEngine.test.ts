import { describe, it, expect, beforeEach } from "vitest";
import { runNetworkSync } from "./syncEngine";
import { MockAdapter } from "./adapters/mockAdapter";
import type { LogErrorParams, SyncRunCounts, SyncRunRecord, SyncStore } from "./syncStore";

/** Deterministic in-memory SyncStore — no network, no database. */
class InMemorySyncStore implements SyncStore {
  runs = new Map<string, SyncRunRecord>();
  errors: LogErrorParams[] = [];
  private nextId = 1;

  async createRun(networkId: string): Promise<SyncRunRecord> {
    const id = `run-${this.nextId++}`;
    const record: SyncRunRecord = {
      id,
      networkId,
      status: "running",
      startedAt: new Date().toISOString(),
      completedAt: null,
      productsFound: 0,
      productsImported: 0,
      productsUpdated: 0,
      productsRejected: 0,
      errorsCount: 0,
      errorMessage: null,
    };
    this.runs.set(id, record);
    return record;
  }

  async completeRun(runId: string, counts: SyncRunCounts): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) throw new Error("Run not found");
    Object.assign(run, {
      status: "completed",
      completedAt: new Date().toISOString(),
      ...(counts.productsFound !== undefined && { productsFound: counts.productsFound }),
      ...(counts.productsImported !== undefined && { productsImported: counts.productsImported }),
      ...(counts.productsUpdated !== undefined && { productsUpdated: counts.productsUpdated }),
      ...(counts.productsRejected !== undefined && { productsRejected: counts.productsRejected }),
    });
  }

  async failRun(runId: string, errorMessage: string, errorsCount = 1): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) throw new Error("Run not found");
    Object.assign(run, {
      status: "failed",
      completedAt: new Date().toISOString(),
      errorsCount,
      errorMessage,
    });
  }

  async logError(params: LogErrorParams): Promise<void> {
    this.errors.push(params);
  }
}

describe("runNetworkSync", () => {
  let store: InMemorySyncStore;

  beforeEach(() => {
    store = new InMemorySyncStore();
  });

  it("creates a sync run and marks it completed on success", async () => {
    const adapter = new MockAdapter();

    const outcome = await runNetworkSync(store, "network-1", adapter);

    expect(outcome.status).toBe("completed");
    expect(outcome.productsFound).toBe(2); // fixture has 2 products
    expect(outcome.errorMessage).toBeNull();

    const stored = store.runs.get(outcome.runId);
    expect(stored?.status).toBe("completed");
    expect(stored?.productsFound).toBe(2);
    expect(stored?.completedAt).not.toBeNull();
    expect(store.errors).toHaveLength(0);
  });

  it("creates a sync run for the exact network id it was called with", async () => {
    const adapter = new MockAdapter();
    const outcome = await runNetworkSync(store, "network-xyz", adapter);
    expect(store.runs.get(outcome.runId)?.networkId).toBe("network-xyz");
  });

  it("marks the run failed and logs an error when the adapter throws", async () => {
    const adapter = new MockAdapter({ shouldFail: true });

    const outcome = await runNetworkSync(store, "network-1", adapter);

    expect(outcome.status).toBe("failed");
    expect(outcome.productsFound).toBe(0);
    expect(outcome.errorMessage).toBe("Mock fetch failure");

    const stored = store.runs.get(outcome.runId);
    expect(stored?.status).toBe("failed");
    expect(stored?.errorMessage).toBe("Mock fetch failure");
    expect(stored?.completedAt).not.toBeNull();

    expect(store.errors).toHaveLength(1);
    expect(store.errors[0]).toMatchObject({
      syncRunId: outcome.runId,
      networkId: "network-1",
      errorType: "sync_failure",
      errorMessage: "Mock fetch failure",
    });
  });

  it("never leaves a run stuck in 'running' after failure", async () => {
    const adapter = new MockAdapter({ shouldFail: true });
    const outcome = await runNetworkSync(store, "network-1", adapter);
    const stored = store.runs.get(outcome.runId);
    expect(stored?.status).not.toBe("running");
  });
});
