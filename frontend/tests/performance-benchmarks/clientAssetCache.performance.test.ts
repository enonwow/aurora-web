import { describe, expect, it, vi } from "vitest";

import { createBrowserClientAssetCachePort } from "../../src/modules/shared/adapters/browserClientAssetCachePort";
import { createClientAssetCachedFetch } from "../../src/modules/shared/application/clientAssetCachedFetch";

class BenchmarkMemoryCache {
  readonly entries = new Map<string, Response>();

  async keys(): Promise<Request[]> {
    return [...this.entries.keys()].map((url) => new Request(url));
  }

  async match(request: Request): Promise<Response | undefined> {
    return this.entries.get(request.url)?.clone();
  }

  async put(request: Request, response: Response): Promise<void> {
    this.entries.set(request.url, response.clone());
  }

  async delete(request: Request): Promise<boolean> {
    return this.entries.delete(request.url);
  }
}

class BenchmarkMemoryCacheStorage {
  readonly stores = new Map<string, BenchmarkMemoryCache>();

  async open(name: string): Promise<BenchmarkMemoryCache> {
    const existing = this.stores.get(name);
    if (existing) return existing;
    const created = new BenchmarkMemoryCache();
    this.stores.set(name, created);
    return created;
  }

  async delete(name: string): Promise<boolean> {
    return this.stores.delete(name);
  }

  async keys(): Promise<string[]> {
    return [...this.stores.keys()];
  }
}

describe("client immutable asset cache performance budget", () => {
  it("keeps bounded admission and repeated cache hits inside the local regression budget", async () => {
    const cacheStorage = new BenchmarkMemoryCacheStorage();
    let clock = 1;
    const entryBytes = 1024;
    const budgetBytes = 64 * entryBytes;
    const admissionCount = 128;
    const cacheHitCount = 500;
    const admissionBudgetMs = 2_500;
    const cacheHitBudgetMs = 1_000;
    const port = createBrowserClientAssetCachePort({
      cacheStorage,
      budgetBytes,
      origin: "https://aurora.test",
      now: () => clock++,
    });

    const admissionStartedAt = performance.now();
    for (let index = 0; index < admissionCount; index += 1) {
      const lineage = index.toString(16).padStart(64, "0");
      await port.put(
        {
          url: `/_aurora/v1/catalog/placeables/cache/${lineage}/assets/model.glb`,
          lineageSha256: lineage,
          scopeKey: "benchmark-user",
        },
        new Response(new Uint8Array(entryBytes)),
      );
    }
    const admissionDurationMs = performance.now() - admissionStartedAt;
    const snapshot = await port.inspect();

    const retainedLineage = (admissionCount - 1).toString(16).padStart(64, "0");
    const retainedUrl = `https://aurora.test/_aurora/v1/catalog/placeables/cache/${retainedLineage}/assets/model.glb`;
    const networkFetch = vi.fn(async () => new Response("unexpected-network"));
    const cachedFetch = createClientAssetCachedFetch({
      cachePort: port,
      networkFetch,
      scopeKey: "benchmark-user",
      origin: "https://aurora.test",
    });
    const cacheHitStartedAt = performance.now();
    for (let index = 0; index < cacheHitCount; index += 1) {
      const response = await cachedFetch(retainedUrl);
      expect(response.ok).toBe(true);
    }
    const cacheHitDurationMs = performance.now() - cacheHitStartedAt;

    expect(snapshot).toMatchObject({
      budgetBytes,
      usedBytes: budgetBytes,
      entryCount: budgetBytes / entryBytes,
      overBudget: false,
    });
    expect(networkFetch).not.toHaveBeenCalled();
    expect(admissionDurationMs).toBeLessThan(admissionBudgetMs);
    expect(cacheHitDurationMs).toBeLessThan(cacheHitBudgetMs);
  }, 10_000);
});
