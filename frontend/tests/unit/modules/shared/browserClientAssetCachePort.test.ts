import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AURORA_CLIENT_ASSET_CACHE_BUDGET_BYTES,
  AURORA_CLIENT_ASSET_CACHE_NAME,
  createBrowserClientAssetCachePort,
} from "../../../../src/modules/shared/adapters/browserClientAssetCachePort";
import {
  createClientAssetCachedFetch,
  installClientAssetCachedFetch,
} from "../../../../src/modules/shared/application/clientAssetCachedFetch";
import { enforceClientAssetCacheBudgetAtStartup } from "../../../../src/modules/shared/application/clientAssetCacheLifecycle";

class MemoryCache {
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

class MemoryCacheStorage {
  readonly stores = new Map<string, MemoryCache>();

  async open(name: string): Promise<MemoryCache> {
    const current = this.stores.get(name);
    if (current) return current;
    const created = new MemoryCache();
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

describe("browserClientAssetCachePort", () => {
  beforeEach(() => window.localStorage.clear());

  it("defines the exact 2 GiB immutable-asset budget", () => {
    expect(AURORA_CLIENT_ASSET_CACHE_BUDGET_BYTES).toBe(2 * 1024 * 1024 * 1024);
  });

  it("measures stored bytes and evicts the least-recently-used lineage before exceeding budget", async () => {
    const cacheStorage = new MemoryCacheStorage();
    let now = 10;
    const port = createBrowserClientAssetCachePort({
      cacheStorage,
      budgetBytes: 10,
      origin: "https://aurora.test",
      now: () => now++,
    });
    const lineageA = "a".repeat(64);
    const lineageB = "b".repeat(64);

    await port.put(
      { url: "/_aurora/v1/catalog/placeables/cache/a/assets/a.glb", lineageSha256: lineageA, scopeKey: "user-1" },
      new Response("123456")
    );
    await port.put(
      { url: "/_aurora/v1/catalog/placeables/cache/b/assets/b.glb", lineageSha256: lineageB, scopeKey: "user-1" },
      new Response("abcdef")
    );

    expect(await port.match({ url: "/_aurora/v1/catalog/placeables/cache/a/assets/a.glb", lineageSha256: lineageA, scopeKey: "user-1" })).toBeNull();
    expect(await (await port.match({ url: "/_aurora/v1/catalog/placeables/cache/b/assets/b.glb", lineageSha256: lineageB, scopeKey: "user-1" }))?.text()).toBe("abcdef");
    await expect(port.inspect()).resolves.toMatchObject({
      status: "ready",
      budgetBytes: 10,
      usedBytes: 6,
      entryCount: 1,
      overBudget: false,
    });
  });

  it("clears only the owned immutable-asset cache and preserves auth and draft recovery", async () => {
    const cacheStorage = new MemoryCacheStorage();
    await cacheStorage.open("unrelated-cache");
    window.localStorage.setItem("aurora_web.auth_session.v1", "auth");
    window.localStorage.setItem("aurora-web.local-area-drafts.v1", "draft");
    const port = createBrowserClientAssetCachePort({ cacheStorage, origin: "https://aurora.test" });
    await port.put(
      { url: "/asset.glb", lineageSha256: "c".repeat(64), scopeKey: "user-1" },
      new Response("asset")
    );

    await expect(port.clear()).resolves.toMatchObject({ clearedEntries: 1, clearedBytes: 5 });
    expect(await cacheStorage.keys()).toEqual(["unrelated-cache"]);
    expect(window.localStorage.getItem("aurora_web.auth_session.v1")).toBe("auth");
    expect(window.localStorage.getItem("aurora-web.local-area-drafts.v1")).toBe("draft");
  });

  it("rejects one immutable entry larger than the hard budget without evicting into an over-budget state", async () => {
    const cacheStorage = new MemoryCacheStorage();
    const port = createBrowserClientAssetCachePort({
      cacheStorage,
      budgetBytes: 4,
      origin: "https://aurora.test",
    });

    await expect(port.put(
      { url: "/large.glb", lineageSha256: "e".repeat(64), scopeKey: "user-1" },
      new Response("12345")
    )).resolves.toMatchObject({
      stored: false,
      reason: "entry_over_budget",
      snapshot: { usedBytes: 0, entryCount: 0, overBudget: false },
    });
  });

  it("serves full-lineage immutable delivery URLs through the bounded cache", async () => {
    const cacheStorage = new MemoryCacheStorage();
    const port = createBrowserClientAssetCachePort({ cacheStorage, origin: "https://aurora.test" });
    const lineage = "d".repeat(64);
    const url = `https://aurora.test/_aurora/v1/catalog/placeables/cache/${lineage}/assets/model.glb`;
    const networkFetch = vi.fn(async () => new Response("model-bytes", { status: 200 }));
    const onDiagnostic = vi.fn();
    const cachedFetch = createClientAssetCachedFetch({
      cachePort: port,
      networkFetch,
      scopeKey: "user-1",
      origin: "https://aurora.test",
      onDiagnostic,
    });

    expect(await (await cachedFetch(url)).text()).toBe("model-bytes");
    const cacheHit = await cachedFetch(url);
    expect(await cacheHit.text()).toBe("model-bytes");
    expect(cacheHit.headers.get("x-aurora-client-cache-size")).toBeNull();
    expect(cacheHit.headers.get("x-aurora-client-cache-last-used")).toBeNull();
    expect(cacheHit.headers.get("x-aurora-client-cache-lineage")).toBeNull();
    expect(networkFetch).toHaveBeenCalledTimes(1);
    expect(cacheStorage.stores.has(AURORA_CLIENT_ASSET_CACHE_NAME)).toBe(true);
    expect(onDiagnostic.mock.calls.map(([event]) => [event.operation, event.outcome])).toEqual([
      ["match", "miss"],
      ["put", "stored"],
      ["match", "hit"],
    ]);
  });

  it("installs one scope-bound cached fetch for both runtime asset lanes", () => {
    const cacheStorage = new MemoryCacheStorage();
    const port = createBrowserClientAssetCachePort({ cacheStorage, origin: "https://aurora.test" });
    const networkFetch = vi.fn(async () => new Response("asset", { status: 200 }));
    const runtime: {
      placeableModelFetch?: typeof fetch;
      placeableTextureFetch?: typeof fetch;
    } = {};

    const cachedFetch = installClientAssetCachedFetch(runtime, {
      cachePort: port,
      networkFetch,
      scopeKey: "user-1",
      origin: "https://aurora.test",
    });

    expect(runtime.placeableModelFetch).toBe(cachedFetch);
    expect(runtime.placeableTextureFetch).toBe(cachedFetch);
  });

  it("enforces the persisted hard budget during application startup and reports the result", async () => {
    const enforceBudget = vi.fn(async () => ({
      status: "ready" as const,
      budgetBytes: 2 * 1024 * 1024 * 1024,
      usedBytes: 1024,
      entryCount: 1,
      overBudget: false,
    }));
    const onDiagnostic = vi.fn();
    const port = { enforceBudget } as unknown as import("../../../../src/modules/shared/application/clientAssetCachePort").ClientAssetCachePort;

    await expect(enforceClientAssetCacheBudgetAtStartup(port, onDiagnostic)).resolves.toMatchObject({
      status: "ready",
      overBudget: false,
    });
    expect(enforceBudget).toHaveBeenCalledOnce();
    expect(onDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      operation: "enforce",
      outcome: "ready",
      usedBytes: 1024,
    }));
  });
});
