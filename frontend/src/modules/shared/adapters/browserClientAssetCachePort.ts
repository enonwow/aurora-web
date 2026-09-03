import type {
  ClientAssetCacheKey,
  ClientAssetCachePort,
  ClientAssetCacheSnapshot,
} from "../application/clientAssetCachePort";

export const AURORA_CLIENT_ASSET_CACHE_BUDGET_BYTES = 2 * 1024 * 1024 * 1024;
export const AURORA_CLIENT_ASSET_CACHE_NAME = "aurora-web.immutable-assets.v1";

const CACHE_SIZE_HEADER = "x-aurora-client-cache-size";
const CACHE_LAST_USED_HEADER = "x-aurora-client-cache-last-used";
const CACHE_LINEAGE_HEADER = "x-aurora-client-cache-lineage";
const CACHE_SCOPE_PARAM = "__aurora_cache_scope";
const CACHE_LINEAGE_PARAM = "__aurora_cache_lineage";

interface CacheLike {
  keys(): Promise<readonly Request[]>;
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
  delete(request: Request): Promise<boolean>;
}

interface CacheStorageLike {
  open(name: string): Promise<CacheLike>;
  delete(name: string): Promise<boolean>;
  keys(): Promise<readonly string[]>;
}

interface BrowserClientAssetCachePortOptions {
  readonly cacheStorage?: CacheStorageLike | null;
  readonly budgetBytes?: number;
  readonly origin?: string;
  readonly now?: () => number;
}

interface CacheEntryMeasurement {
  readonly request: Request;
  readonly sizeBytes: number;
  readonly lastUsedUnixMs: number;
}

export function createBrowserClientAssetCachePort(
  options: BrowserClientAssetCachePortOptions = {},
): ClientAssetCachePort {
  const cacheStorage = options.cacheStorage === undefined
    ? resolveBrowserCacheStorage()
    : options.cacheStorage;
  const budgetBytes = options.budgetBytes ?? AURORA_CLIENT_ASSET_CACHE_BUDGET_BYTES;
  const origin = options.origin ?? resolveBrowserOrigin();
  const now = options.now ?? Date.now;
  let operationTail: Promise<void> = Promise.resolve();
  let entryIndex: Map<string, CacheEntryMeasurement> | null = null;

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const pending = operationTail.then(operation, operation);
    operationTail = pending.then(() => undefined, () => undefined);
    return pending;
  };

  const unsupportedSnapshot = (): ClientAssetCacheSnapshot => ({
    status: "unsupported",
    budgetBytes,
    usedBytes: 0,
    entryCount: 0,
    overBudget: false,
  });

  const readCacheIndex = async (cache: CacheLike): Promise<Map<string, CacheEntryMeasurement>> => {
    const requests = await cache.keys();
    const entries = new Map<string, CacheEntryMeasurement>();
    for (const request of requests) {
      const response = await cache.match(request);
      if (!response) continue;
      const declaredSize = Number(response.headers.get(CACHE_SIZE_HEADER));
      const declaredLastUsed = Number(response.headers.get(CACHE_LAST_USED_HEADER));
      const sizeBytes = Number.isSafeInteger(declaredSize) && declaredSize >= 0
        ? declaredSize
        : (await response.clone().arrayBuffer()).byteLength;
      entries.set(request.url, {
        request,
        sizeBytes,
        lastUsedUnixMs: Number.isFinite(declaredLastUsed) ? declaredLastUsed : 0,
      });
    }
    return entries;
  };

  const loadCacheIndex = async (
    cache: CacheLike,
    refresh = false,
  ): Promise<Map<string, CacheEntryMeasurement>> => {
    if (refresh || entryIndex === null) {
      entryIndex = await readCacheIndex(cache);
    }
    return entryIndex;
  };

  const snapshotFromIndex = (
    index: ReadonlyMap<string, CacheEntryMeasurement>,
  ): ClientAssetCacheSnapshot => {
    const usedBytes = [...index.values()].reduce((sum, entry) => sum + entry.sizeBytes, 0);
    return {
      status: "ready",
      budgetBytes,
      usedBytes,
      entryCount: index.size,
      overBudget: usedBytes > budgetBytes,
    };
  };

  const enforceCacheBudget = async (
    cache: CacheLike,
    refresh = false,
  ): Promise<ClientAssetCacheSnapshot> => {
    const index = await loadCacheIndex(cache, refresh);
    const measured = snapshotFromIndex(index);
    if (!measured.overBudget) return measured;
    let usedBytes = measured.usedBytes;
    let entryCount = measured.entryCount;
    const oldestFirst = [...index.values()].sort((left, right) =>
      left.lastUsedUnixMs - right.lastUsedUnixMs || left.request.url.localeCompare(right.request.url)
    );
    for (const entry of oldestFirst) {
      if (usedBytes <= budgetBytes) break;
      if (await cache.delete(entry.request)) {
        index.delete(entry.request.url);
        usedBytes -= entry.sizeBytes;
        entryCount -= 1;
      }
    }
    return {
      status: "ready",
      budgetBytes,
      usedBytes,
      entryCount,
      overBudget: usedBytes > budgetBytes,
    };
  };

  return {
    inspect: () => enqueue(async () => {
      if (!cacheStorage) return unsupportedSnapshot();
      const cache = await cacheStorage.open(AURORA_CLIENT_ASSET_CACHE_NAME);
      return snapshotFromIndex(await loadCacheIndex(cache, true));
    }),

    match: (key) => enqueue(async () => {
      validateClientAssetCacheKey(key);
      if (!cacheStorage) return null;
      const cache = await cacheStorage.open(AURORA_CLIENT_ASSET_CACHE_NAME);
      const index = await loadCacheIndex(cache);
      const request = buildCacheRequest(key, origin);
      const cached = await cache.match(request);
      if (!cached) return null;
      const bytes = await cached.clone().arrayBuffer();
      const lastUsedUnixMs = now();
      await cache.put(request, buildStoredResponse(cached, bytes, key, lastUsedUnixMs));
      index.set(request.url, {
        request,
        sizeBytes: bytes.byteLength,
        lastUsedUnixMs,
      });
      return new Response(bytes, copyResponseInit(cached));
    }),

    put: (key, response) => enqueue(async () => {
      validateClientAssetCacheKey(key);
      if (!cacheStorage) {
        return { stored: false, reason: "unsupported", snapshot: unsupportedSnapshot() };
      }
      const cache = await cacheStorage.open(AURORA_CLIENT_ASSET_CACHE_NAME);
      const index = await loadCacheIndex(cache);
      if (!response.ok) {
        return {
          stored: false,
          reason: "response_not_ok",
          snapshot: snapshotFromIndex(index),
        };
      }
      const bytes = await response.clone().arrayBuffer();
      if (bytes.byteLength > budgetBytes) {
        return {
          stored: false,
          reason: "entry_over_budget",
          snapshot: await enforceCacheBudget(cache),
        };
      }
      const request = buildCacheRequest(key, origin);
      await deletePriorLineages(cache, request, key.scopeKey, index);
      const lastUsedUnixMs = now();
      await cache.put(request, buildStoredResponse(response, bytes, key, lastUsedUnixMs));
      index.set(request.url, {
        request,
        sizeBytes: bytes.byteLength,
        lastUsedUnixMs,
      });
      return {
        stored: true,
        reason: "stored",
        snapshot: await enforceCacheBudget(cache),
      };
    }),

    enforceBudget: () => enqueue(async () => {
      if (!cacheStorage) return unsupportedSnapshot();
      return enforceCacheBudget(await cacheStorage.open(AURORA_CLIENT_ASSET_CACHE_NAME), true);
    }),

    clear: () => enqueue(async () => {
      if (!cacheStorage) return { clearedEntries: 0, clearedBytes: 0 };
      const names = await cacheStorage.keys();
      if (!names.includes(AURORA_CLIENT_ASSET_CACHE_NAME)) {
        return { clearedEntries: 0, clearedBytes: 0 };
      }
      const cache = await cacheStorage.open(AURORA_CLIENT_ASSET_CACHE_NAME);
      const measured = snapshotFromIndex(await loadCacheIndex(cache, true));
      await cacheStorage.delete(AURORA_CLIENT_ASSET_CACHE_NAME);
      entryIndex = new Map();
      return {
        clearedEntries: measured.entryCount,
        clearedBytes: measured.usedBytes,
      };
    }),
  };
}

function resolveBrowserCacheStorage(): CacheStorageLike | null {
  return typeof globalThis.caches === "undefined"
    ? null
    : globalThis.caches as unknown as CacheStorageLike;
}

function resolveBrowserOrigin(): string {
  return typeof window === "undefined" ? "http://aurora.local" : window.location.origin;
}

function validateClientAssetCacheKey(key: ClientAssetCacheKey): void {
  if (!/^[a-f0-9]{64}$/u.test(key.lineageSha256)) {
    throw new Error("CLIENT_ASSET_CACHE_LINEAGE_INVALID");
  }
  if (!key.scopeKey.trim()) throw new Error("CLIENT_ASSET_CACHE_SCOPE_INVALID");
}

function buildCacheRequest(key: ClientAssetCacheKey, origin: string): Request {
  const url = new URL(key.url, origin);
  url.searchParams.set(CACHE_SCOPE_PARAM, key.scopeKey);
  url.searchParams.set(CACHE_LINEAGE_PARAM, key.lineageSha256);
  return new Request(url.toString(), { method: "GET" });
}

function copyResponseInit(response: Response): ResponseInit {
  const headers = new Headers(response.headers);
  headers.delete(CACHE_SIZE_HEADER);
  headers.delete(CACHE_LAST_USED_HEADER);
  headers.delete(CACHE_LINEAGE_HEADER);
  return {
    status: response.status,
    statusText: response.statusText,
    headers,
  };
}

function buildStoredResponse(
  response: Response,
  bytes: ArrayBuffer,
  key: ClientAssetCacheKey,
  lastUsedUnixMs: number,
): Response {
  const headers = new Headers(response.headers);
  headers.set(CACHE_SIZE_HEADER, String(bytes.byteLength));
  headers.set(CACHE_LAST_USED_HEADER, String(lastUsedUnixMs));
  headers.set(CACHE_LINEAGE_HEADER, key.lineageSha256);
  return new Response(bytes, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function deletePriorLineages(
  cache: CacheLike,
  requested: Request,
  scopeKey: string,
  index: Map<string, CacheEntryMeasurement>,
): Promise<void> {
  const requestedUrl = stripInternalCacheParams(requested.url);
  for (const entry of [...index.values()]) {
    const existing = entry.request;
    const existingUrl = new URL(existing.url);
    if (
      existingUrl.searchParams.get(CACHE_SCOPE_PARAM) === scopeKey &&
      stripInternalCacheParams(existing.url) === requestedUrl &&
      existing.url !== requested.url
    ) {
      if (await cache.delete(existing)) {
        index.delete(existing.url);
      }
    }
  }
}

function stripInternalCacheParams(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.searchParams.delete(CACHE_SCOPE_PARAM);
  url.searchParams.delete(CACHE_LINEAGE_PARAM);
  return url.toString();
}
