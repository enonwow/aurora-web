import type {
  ClientAssetCacheDiagnosticSink,
  ClientAssetCachePort,
} from "./clientAssetCachePort";

interface CreateClientAssetCachedFetchOptions {
  readonly cachePort: ClientAssetCachePort;
  readonly networkFetch?: typeof fetch;
  readonly scopeKey: string;
  readonly origin?: string;
  readonly onDiagnostic?: ClientAssetCacheDiagnosticSink;
}

interface ClientAssetFetchTarget {
  placeableModelFetch?: (...args: never[]) => unknown;
  placeableTextureFetch?: (...args: never[]) => unknown;
}

export function createClientAssetCachedFetch({
  cachePort,
  networkFetch = globalThis.fetch.bind(globalThis),
  scopeKey,
  origin = typeof window === "undefined" ? "http://aurora.local" : window.location.origin,
  onDiagnostic,
}: CreateClientAssetCachedFetchOptions): typeof fetch {
  return async (input, init) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const rawUrl = input instanceof Request ? input.url : input.toString();
    const lineageSha256 = method === "GET"
      ? resolveImmutableAssetLineageSha256(rawUrl, origin)
      : null;
    if (!lineageSha256) return networkFetch(input, init);

    const key = { url: rawUrl, lineageSha256, scopeKey };
    const assetUrl = toDiagnosticAssetUrl(rawUrl, origin);
    let cached: Response | null = null;
    try {
      cached = await cachePort.match(key);
    } catch {
      emitDiagnostic(onDiagnostic, {
        operation: "match",
        outcome: "failed",
        assetUrl,
        lineageSha256,
        errorCode: "CLIENT_ASSET_CACHE_MATCH_FAILED",
      });
    }
    if (cached) {
      emitDiagnostic(onDiagnostic, {
        operation: "match",
        outcome: "hit",
        assetUrl,
        lineageSha256,
      });
      return cached;
    }
    emitDiagnostic(onDiagnostic, {
      operation: "match",
      outcome: "miss",
      assetUrl,
      lineageSha256,
    });

    let response: Response;
    try {
      response = await networkFetch(input, init);
    } catch (error) {
      emitDiagnostic(onDiagnostic, {
        operation: "fetch",
        outcome: "failed",
        assetUrl,
        lineageSha256,
        errorCode: "CLIENT_ASSET_NETWORK_FETCH_FAILED",
      });
      throw error;
    }
    if (response.ok) {
      try {
        const result = await cachePort.put(key, response);
        const snapshot = result.snapshot;
        emitDiagnostic(onDiagnostic, {
          operation: "put",
          outcome: result.stored ? "stored" : "skipped",
          assetUrl,
          lineageSha256,
          budgetBytes: snapshot.budgetBytes,
          usedBytes: snapshot.usedBytes,
          entryCount: snapshot.entryCount,
          ...(!result.stored
            ? { errorCode: `CLIENT_ASSET_CACHE_${result.reason.toUpperCase()}` }
            : {}),
        });
      } catch {
        emitDiagnostic(onDiagnostic, {
          operation: "put",
          outcome: "failed",
          assetUrl,
          lineageSha256,
          errorCode: "CLIENT_ASSET_CACHE_PUT_FAILED",
        });
      }
    } else {
      emitDiagnostic(onDiagnostic, {
        operation: "put",
        outcome: "skipped",
        assetUrl,
        lineageSha256,
        statusCode: response.status,
      });
    }
    return response;
  };
}

export function installClientAssetCachedFetch(
  target: ClientAssetFetchTarget,
  options: CreateClientAssetCachedFetchOptions,
): typeof fetch {
  const cachedFetch = createClientAssetCachedFetch(options);
  target.placeableModelFetch = cachedFetch;
  target.placeableTextureFetch = cachedFetch;
  return cachedFetch;
}

export function resolveImmutableAssetLineageSha256(
  rawUrl: string,
  origin: string,
): string | null {
  const url = new URL(rawUrl, origin);
  if (url.origin !== new URL(origin).origin) return null;
  const queryCandidate = url.searchParams.get("lineageSha256");
  if (queryCandidate && /^[a-f0-9]{64}$/u.test(queryCandidate)) return queryCandidate;
  const segments = url.pathname.split("/").filter(Boolean);
  const cacheIndex = segments.lastIndexOf("cache");
  const pathCandidate = cacheIndex >= 0 ? segments[cacheIndex + 1] : undefined;
  return pathCandidate && /^[a-f0-9]{64}$/u.test(pathCandidate) ? pathCandidate : null;
}

function emitDiagnostic(
  sink: ClientAssetCacheDiagnosticSink | undefined,
  event: Parameters<ClientAssetCacheDiagnosticSink>[0],
): void {
  try {
    sink?.(event);
  } catch {
    // Diagnostics must never change asset delivery behavior.
  }
}

function toDiagnosticAssetUrl(rawUrl: string, origin: string): string {
  const url = new URL(rawUrl, origin);
  url.search = "";
  url.hash = "";
  return url.toString();
}
