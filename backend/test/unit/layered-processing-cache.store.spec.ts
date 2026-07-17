import { LayeredProcessingCacheStore } from "../../src/common/processing-cache/layered-processing-cache.store";

type Entry = {
  key: string;
  value: { payload: string };
  storedAt: string;
  hits: number;
};

function entry(key: string, payload: string): Entry {
  return {
    key,
    value: { payload },
    storedAt: "2026-07-11T00:00:00.000Z",
    hits: 0
  };
}

describe("LayeredProcessingCacheStore", () => {
  it("returns the L1 entry without awaiting a degraded L2 write when configured L1-first", async () => {
    let resolveL2: ((value: Entry) => void) | undefined;
    const l2 = {
      get: jest.fn(),
      set: jest.fn(
        () =>
          new Promise<Entry>((resolve) => {
            resolveL2 = resolve;
          })
      )
    };
    const l1Entry = entry("area-cache", "memory");
    const l1 = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(l1Entry)
    };
    const store = new LayeredProcessingCacheStore(l2, l1, {
      admissionHits: 2,
      admissionWindowMs: 1_000,
      admissionTrackingLimit: 10,
      awaitL2Write: false
    });

    await expect(store.set("area-cache", { payload: "value" })).resolves.toBe(l1Entry);
    expect(l1.set).toHaveBeenCalledWith("area-cache", { payload: "value" });
    expect(l2.set).toHaveBeenCalledWith("area-cache", { payload: "value" });

    resolveL2?.(entry("area-cache", "s3"));
  });

  it("preserves write-through semantics by default", async () => {
    const l2Entry = entry("cache", "s3");
    const l2 = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(l2Entry)
    };
    const l1 = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(entry("cache", "memory"))
    };
    const store = new LayeredProcessingCacheStore(l2, l1, {
      admissionHits: 2,
      admissionWindowMs: 1_000,
      admissionTrackingLimit: 10
    });

    await expect(store.set("cache", { payload: "value" })).resolves.toBe(l2Entry);
  });
});
